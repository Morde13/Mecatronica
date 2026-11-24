import hashlib
import hmac
import os
import re
import time
import unicodedata
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, inspect, or_, text
from sqlalchemy.orm import Session, joinedload, selectinload, sessionmaker

from models import (
    Base,
    Datasheet,
    DetallePrestamo,
    Equipo,
    EspecificacionTecnica,
    Imagen,
    Laboratorio,
    Mantenimiento,
    Prestamo,
    Proveedor,
    Rol,
    Sede,
    Tecnologia,
    TipoAdquisicion,
    TipoAlimentacion,
    TipoMantenimiento,
    Usuario,
)
from schemas import (
    CatalogoSimpleCreate,
    ComponenteEquipoBase,
    DocumentoEquipoBase,
    EquipoCreate,
    ImagenEquipoBase,
    LaboratorioCreate,
    LoginRequest,
    MantenimientoCreate,
    PrestamoCreate,
    PrestamoEstadoUpdate,
    ProveedorCreate,
    RolCreate,
    SedeCreate,
    UsuarioCreate,
    UsuarioEstadoUpdate,
)

app = FastAPI(title="Sistema de Inventario de Laboratorio - Mecatrónica")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Configuración de conexión a MariaDB/MySQL para Bases_de_Mecatronica
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://Mecatronica:mecatronica@192.168.1.13:3306/Bases_de_Mecatronica",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# =======================================================
# CONFIGURACIÓN DE CARPETAS DE ARCHIVOS Y MULTIMEDIA (SIN CALIBRACIONES)
# =======================================================
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIRS = {
    "datasheets": BASE_DIR / "datasheets",
    "imagenes": BASE_DIR / "imagenes",
    "mantenimientos": BASE_DIR / "mantenimientos",
    "img": BASE_DIR / "img",
}

for folder in STORAGE_DIRS.values():
    folder.mkdir(parents=True, exist_ok=True)

app.mount("/archivos/datasheets", StaticFiles(directory=str(STORAGE_DIRS["datasheets"])), name="datasheets")
app.mount("/archivos/imagenes", StaticFiles(directory=str(STORAGE_DIRS["imagenes"])), name="imagenes")
app.mount("/archivos/mantenimientos", StaticFiles(directory=str(STORAGE_DIRS["mantenimientos"])), name="mantenimientos")
app.mount("/archivos/img", StaticFiles(directory=str(STORAGE_DIRS["img"])), name="img")

app.mount("/api/archivos/datasheets", StaticFiles(directory=str(STORAGE_DIRS["datasheets"])), name="api_datasheets")
app.mount("/api/archivos/imagenes", StaticFiles(directory=str(STORAGE_DIRS["imagenes"])), name="api_imagenes")
app.mount("/api/archivos/mantenimientos", StaticFiles(directory=str(STORAGE_DIRS["mantenimientos"])), name="api_mantenimientos")
app.mount("/api/archivos/img", StaticFiles(directory=str(STORAGE_DIRS["img"])), name="api_img")
app.mount("/img", StaticFiles(directory=str(STORAGE_DIRS["img"])), name="img_root")


def normalizar_ruta_publica(ruta: Optional[str]) -> Optional[str]:
    """
    Normaliza las rutas almacenadas en la BD de Mecatrónica (incluyendo rutas
    históricas 'uploads/datasheets/...' o 'uploads/imagenes/...') para servirlas
    desde /api/archivos/...
    """
    if not ruta:
        return ruta
    ruta_limpia = ruta.strip().replace("\\", "/")
    if ruta_limpia.startswith("/api/archivos/"):
        return ruta_limpia
    if ruta_limpia.startswith("/archivos/"):
        return f"/api{ruta_limpia}"
    if ruta_limpia.startswith("uploads/datasheets/"):
        nombre = ruta_limpia.split("/")[-1]
        return f"/api/archivos/datasheets/{nombre}"
    if ruta_limpia.startswith("uploads/imagenes/preventivo/"):
        nombre = ruta_limpia.split("/")[-1]
        if (STORAGE_DIRS["mantenimientos"] / nombre).exists():
            return f"/api/archivos/mantenimientos/{nombre}"
        return f"/api/archivos/imagenes/{nombre}"
    if ruta_limpia.startswith("uploads/imagenes/"):
        nombre = ruta_limpia.split("/")[-1]
        return f"/api/archivos/imagenes/{nombre}"
    if not ruta_limpia.startswith("/") and not ruta_limpia.startswith("http"):
        return f"/api/archivos/{ruta_limpia}"
    return ruta_limpia


TABLAS_ESQUEMA_MECATRONICA = [
    "Datasheets",
    "Detalle_Prestamo",
    "Equipos",
    "Especificaciones_Tecnicas",
    "Imagenes",
    "Laboratorios",
    "Mantenimiento",
    "Prestamos",
    "Proveedor",
    "Roles",
    "Sedes",
    "Tecnologia",
    "Tipo_de_adquisicion",
    "Tipo_de_alimentacion",
    "Tipo_de_mantenimiento",
    "Usuarios",
]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =======================================================
# INSPECCIÓN Y ESTADO DE CONEXIÓN A BASES_DE_MECATRONICA
# =======================================================
@app.get("/tablas")
async def obtener_tablas():
    try:
        inspector = inspect(engine)
        nombres_tablas = inspector.get_table_names()
        return {
            "estado": "Conexión exitosa a Bases_de_Mecatronica",
            "total_tablas": len(nombres_tablas),
            "tablas": nombres_tablas,
        }
    except Exception as e:
        return {"estado": "Error de conexión", "detalle": str(e)}


_ESTADO_CACHE = {"timestamp": 0.0, "data": None}


@app.get("/api/estado")
def verificar_estado_esquema(forzar: bool = False):
    ahora = time.time()
    if not forzar and _ESTADO_CACHE["data"] is not None and (ahora - _ESTADO_CACHE["timestamp"] < 60):
        return _ESTADO_CACHE["data"]

    try:
        inspector = inspect(engine)
        existentes = inspector.get_table_names()
        existentes_lower = {t.lower(): t for t in existentes}
        presentes = [t for t in TABLAS_ESQUEMA_MECATRONICA if t.lower() in existentes_lower]
        faltantes = [t for t in TABLAS_ESQUEMA_MECATRONICA if t.lower() not in existentes_lower]

        columnas_equipos_ok = False
        if "equipos" in existentes_lower:
            cols = {c["name"].lower() for c in inspector.get_columns(existentes_lower["equipos"])}
            columnas_equipos_ok = "id_equipos" in cols and "nombre_equipo" in cols

        esquema_listo = len(faltantes) == 0 and columnas_equipos_ok
        resultado = {
            "conectado": True,
            "esquema_listo": esquema_listo,
            "base_datos": "Bases_de_Mecatronica",
            "tablas_detectadas": existentes,
            "tablas_presentes_esquema": presentes,
            "tablas_faltantes_esquema": faltantes,
            "columnas_equipos_compatibles": columnas_equipos_ok,
        }
        _ESTADO_CACHE["timestamp"] = ahora
        _ESTADO_CACHE["data"] = resultado
        return resultado
    except Exception as e:
        resultado = {
            "conectado": False,
            "esquema_listo": False,
            "detalle": str(e),
            "tablas_faltantes_esquema": TABLAS_ESQUEMA_MECATRONICA,
        }
        _ESTADO_CACHE["timestamp"] = ahora
        _ESTADO_CACHE["data"] = resultado
        return resultado


# =======================================================
# GESTIÓN DE ARCHIVOS (DATASHEETS, IMÁGENES, MANTENIMIENTOS, LOGO)
# =======================================================
@app.get("/api/logo")
def obtener_logo_universidad():
    return {
        "logo_url": "/archivos/img/escudo_universidad.png",
        "nombre": "escudo_universidad.png",
    }


def _limpiar_segmento_nombre(texto: Optional[str], por_defecto: str) -> str:
    if not texto or not texto.strip():
        return por_defecto
    sin_acentos = (
        unicodedata.normalize("NFKD", texto.strip())
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    limpio = re.sub(r"[^a-zA-Z0-9-]+", "_", sin_acentos).strip("_")
    return limpio or por_defecto


@app.post("/api/upload/{categoria}")
async def subir_archivo(
    categoria: str,
    file: UploadFile = File(...),
    tipo_documento: Optional[str] = Form(None),
    nombre_equipo: Optional[str] = Form(None),
):
    if categoria == "img":
        raise HTTPException(
            status_code=403,
            detail="El escudo institucional es fijo y no se puede modificar.",
        )
    if categoria not in STORAGE_DIRS:
        raise HTTPException(status_code=400, detail=f"Categoría inválida: {categoria}")

    nombre_original = file.filename or "archivo"
    ext = Path(nombre_original).suffix.lower()
    if not ext:
        ext = ".webp" if categoria == "imagenes" else ".pdf"

    fecha_hora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    etiqueta_por_defecto = (
        "Fotografia"
        if categoria == "imagenes"
        else "Mantenimiento"
        if categoria == "mantenimientos"
        else "Datasheet"
    )
    seg_tipo = _limpiar_segmento_nombre(tipo_documento, etiqueta_por_defecto)
    seg_equipo = _limpiar_segmento_nombre(nombre_equipo, "Equipo")

    base_nombre = f"{fecha_hora}_{seg_tipo}_{seg_equipo}"
    nombre_final = f"{base_nombre}{ext}"
    destino = STORAGE_DIRS[categoria] / nombre_final

    consecutivo = 2
    while destino.exists():
        nombre_final = f"{base_nombre}_{consecutivo}{ext}"
        destino = STORAGE_DIRS[categoria] / nombre_final
        consecutivo += 1

    contenido = await file.read()
    with open(destino, "wb") as f:
        f.write(contenido)

    ruta_publica = f"/api/archivos/{categoria}/{nombre_final}"
    return {
        "mensaje": "Archivo almacenado correctamente",
        "nombre_archivo": nombre_final,
        "ruta": ruta_publica,
        "tipo": ext.lstrip(".") or "pdf",
        "categoria": categoria,
    }


# =======================================================
# CATÁLOGOS PARAMÉTRICOS, SEDES, LABORATORIOS Y PROVEEDORES
# =======================================================
@app.get("/api/catalogos")
def obtener_todos_los_catalogos(db: Session = Depends(get_db)):
    try:
        sedes = db.query(Sede).order_by(Sede.Nombre_Sede).all()
        laboratorios = (
            db.query(Laboratorio)
            .options(joinedload(Laboratorio.sede))
            .order_by(Laboratorio.Nombre_Laboratorio)
            .all()
        )
        return {
            "sedes": [{"id_sede": s.Id_Sede, "nombre_sede": s.Nombre_Sede} for s in sedes],
            "laboratorios": [
                {
                    "id_laboratorio": l.Id_Laboratorio,
                    "nombre_laboratorio": l.Nombre_Laboratorio,
                    "id_sede": l.Id_Sede,
                    "nombre_sede": l.sede.Nombre_Sede if l.sede else None,
                }
                for l in laboratorios
            ],
            "tipos_adquisicion": [
                {"id": x.Id_Adquisicion, "descripcion": x.Tipo}
                for x in db.query(TipoAdquisicion).order_by(TipoAdquisicion.Id_Adquisicion).all()
            ],
            "fuentes_alimentacion": [
                {"id": x.Id_Alimentacion, "descripcion": x.Tipo}
                for x in db.query(TipoAlimentacion).order_by(TipoAlimentacion.Id_Alimentacion).all()
            ],
            "tecnologias": [
                {"id": x.Id_Tecnologia, "descripcion": x.Tipo}
                for x in db.query(Tecnologia).order_by(Tecnologia.Id_Tecnologia).all()
            ],
            "tipos_mantenimiento": [
                {
                    "id": x.Id_TMantenimiento,
                    "descripcion": x.Tipo_Mantenimiento,
                    "detalle": x.Descripcion,
                }
                for x in db.query(TipoMantenimiento).order_by(TipoMantenimiento.Id_TMantenimiento).all()
            ],
            "proveedores": [
                {
                    "id_proveedor": p.Id_Proveedor,
                    "nombre_proveedor": p.Nombre,
                    "nit": p.NIT,
                    "correo_electronico": p.Correo,
                    "direccion": p.Direccion,
                    "pais_origen": p.Origen,
                    "telefono": p.Telefono,
                }
                for p in db.query(Proveedor).order_by(Proveedor.Nombre).all()
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar catálogos: {str(e)}")


@app.post("/api/sedes")
def crear_sede(payload: SedeCreate, db: Session = Depends(get_db)):
    nueva = Sede(Nombre_Sede=payload.nombre_sede.strip())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return {"id_sede": nueva.Id_Sede, "nombre_sede": nueva.Nombre_Sede}


@app.delete("/api/sedes/{id_sede}")
def eliminar_sede(id_sede: int, db: Session = Depends(get_db)):
    sede = db.query(Sede).filter(Sede.Id_Sede == id_sede).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    labs_ids = [
        l.Id_Laboratorio
        for l in db.query(Laboratorio).filter(Laboratorio.Id_Sede == id_sede).all()
    ]
    if labs_ids:
        db.query(Equipo).filter(Equipo.Id_Laboratorio.in_(labs_ids)).update(
            {Equipo.Id_Laboratorio: None}, synchronize_session=False
        )
    db.delete(sede)
    db.commit()
    return {"mensaje": "Sede eliminada correctamente"}


@app.post("/api/laboratorios")
def crear_laboratorio(payload: LaboratorioCreate, db: Session = Depends(get_db)):
    id_sede = payload.id_sede
    if not id_sede:
        primera_sede = db.query(Sede).first()
        if not primera_sede:
            primera_sede = Sede(Nombre_Sede="Sede Principal")
            db.add(primera_sede)
            db.flush()
        id_sede = primera_sede.Id_Sede

    nuevo = Laboratorio(
        Nombre_Laboratorio=payload.nombre_laboratorio.strip(),
        Id_Sede=id_sede,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {
        "id_laboratorio": nuevo.Id_Laboratorio,
        "nombre_laboratorio": nuevo.Nombre_Laboratorio,
        "id_sede": nuevo.Id_Sede,
    }


@app.delete("/api/laboratorios/{id_laboratorio}")
def eliminar_laboratorio(id_laboratorio: int, db: Session = Depends(get_db)):
    lab = db.query(Laboratorio).filter(Laboratorio.Id_Laboratorio == id_laboratorio).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratorio no encontrado")
    db.query(Equipo).filter(Equipo.Id_Laboratorio == id_laboratorio).update(
        {Equipo.Id_Laboratorio: None}, synchronize_session=False
    )
    db.delete(lab)
    db.commit()
    return {"mensaje": "Laboratorio eliminado correctamente"}


@app.post("/api/proveedores")
def crear_proveedor(payload: ProveedorCreate, db: Session = Depends(get_db)):
    nuevo = Proveedor(
        Nombre=payload.nombre_proveedor.strip(),
        NIT=(payload.nit or "S/N").strip(),
        Telefono=payload.telefono,
        Correo=payload.correo_electronico,
        Direccion=payload.direccion,
        Origen=payload.pais_origen,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {
        "id_proveedor": nuevo.Id_Proveedor,
        "nombre_proveedor": nuevo.Nombre,
        "nit": nuevo.NIT,
        "telefono": nuevo.Telefono,
    }


@app.delete("/api/proveedores/{id_proveedor}")
def eliminar_proveedor(id_proveedor: int, db: Session = Depends(get_db)):
    prov = db.query(Proveedor).filter(Proveedor.Id_Proveedor == id_proveedor).first()
    if not prov:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    en_uso = db.query(Equipo).filter(Equipo.Id_Proveedor == id_proveedor).count()
    if en_uso > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar este proveedor porque está asociado a {en_uso} equipo(s).",
        )
    db.delete(prov)
    db.commit()
    return {"mensaje": "Proveedor eliminado correctamente"}


CATALOGO_MAP = {
    "tipos_adquisicion": (TipoAdquisicion, "Id_Adquisicion", "Tipo"),
    "fuentes_alimentacion": (TipoAlimentacion, "Id_Alimentacion", "Tipo"),
    "tecnologias": (Tecnologia, "Id_Tecnologia", "Tipo"),
    "tipos_mantenimiento": (TipoMantenimiento, "Id_TMantenimiento", "Tipo_Mantenimiento"),
}


@app.post("/api/catalogos/{nombre_catalogo}")
def crear_item_catalogo(
    nombre_catalogo: str, payload: CatalogoSimpleCreate, db: Session = Depends(get_db)
):
    if nombre_catalogo not in CATALOGO_MAP:
        raise HTTPException(status_code=400, detail="Catálogo no reconocido en Mecatrónica")
    modelo, pk_attr, text_attr = CATALOGO_MAP[nombre_catalogo]
    kwargs = {text_attr: payload.valor.strip()}
    if nombre_catalogo == "tipos_mantenimiento" and payload.descripcion:
        kwargs["Descripcion"] = payload.descripcion.strip()
    instancia = modelo(**kwargs)
    db.add(instancia)
    db.commit()
    db.refresh(instancia)
    return {"id": getattr(instancia, pk_attr), "descripcion": getattr(instancia, text_attr)}


@app.delete("/api/catalogos/{nombre_catalogo}/{id_item}")
def eliminar_item_catalogo(
    nombre_catalogo: str, id_item: int, db: Session = Depends(get_db)
):
    if nombre_catalogo not in CATALOGO_MAP:
        raise HTTPException(status_code=400, detail="Catálogo no reconocido en Mecatrónica")
    modelo, pk_attr, _ = CATALOGO_MAP[nombre_catalogo]
    instancia = db.query(modelo).filter(getattr(modelo, pk_attr) == id_item).first()
    if not instancia:
        raise HTTPException(status_code=404, detail="Elemento de catálogo no encontrado")
    try:
        db.delete(instancia)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar esta opción porque está asignada a uno o más registros.",
        )
    return {"mensaje": "Opción eliminada correctamente"}


# =======================================================
# SOPORTE DINÁMICO DE COMPONENTES Y ACCESORIOS (TABLA COMPONENTES)
# =======================================================
_META_COMPONENTES_CACHE = {"timestamp": 0.0, "meta": None}
_IDENTIFICACION_SYNCED = False


def _asegurar_identificacion_opcional():
    """
    Si en la tabla Equipos aún existe la columna histórica 'Identificacion' como NOT NULL,
    la convierte a NULL DEFAULT NULL para que no sea requerida al crear equipos.
    """
    global _IDENTIFICACION_SYNCED
    if _IDENTIFICACION_SYNCED:
        return
    try:
        insp = inspect(engine)
        tablas = {t.lower(): t for t in insp.get_table_names()}
        if "equipos" in tablas:
            cols = {c["name"].lower(): c for c in insp.get_columns(tablas["equipos"])}
            if "identificacion" in cols:
                col_real = cols["identificacion"]["name"]
                with engine.begin() as conn:
                    conn.execute(
                        text(
                            f"ALTER TABLE `{tablas['equipos']}` MODIFY `{col_real}` VARCHAR(100) NULL DEFAULT NULL"
                        )
                    )
        _IDENTIFICACION_SYNCED = True
    except Exception:
        _IDENTIFICACION_SYNCED = True


def _detectar_tabla_componentes(forzar: bool = False) -> Optional[dict]:
    """
    Detecta automáticamente la tabla de Componentes creada en Bases_de_Mecatronica
    (ya sea Componentes_Equipos, Componentes, Componente, etc.) y mapea sus columnas reales.
    """
    ahora = time.time()
    if (
        not forzar
        and _META_COMPONENTES_CACHE["meta"] is not None
        and (ahora - _META_COMPONENTES_CACHE["timestamp"] < 60)
    ):
        return _META_COMPONENTES_CACHE["meta"]

    try:
        insp = inspect(engine)
        existentes = insp.get_table_names()
        existentes_lower = {t.lower(): t for t in existentes}

        tabla_real = None
        for candidata in (
            "componentes_equipos",
            "componentes",
            "componente",
            "componentes_equipo",
            "componente_equipo",
        ):
            if candidata in existentes_lower:
                tabla_real = existentes_lower[candidata]
                break

        if not tabla_real:
            for t_low, t_orig in existentes_lower.items():
                if "component" in t_low or "accesorio" in t_low:
                    tabla_real = t_orig
                    break

        if not tabla_real:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS `Componentes_Equipos` (
                            `Id_Componente` INT(11) NOT NULL AUTO_INCREMENT,
                            `Id_Equipos` INT(11) NOT NULL,
                            `Nombre_Componente` VARCHAR(150) NOT NULL,
                            `Marca` VARCHAR(100) NULL DEFAULT NULL,
                            `Modelo` VARCHAR(100) NULL DEFAULT NULL,
                            `Serie_Referencia` VARCHAR(100) NULL DEFAULT NULL,
                            PRIMARY KEY (`Id_Componente`)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                        """
                    )
                )
            insp = inspect(engine)
            tabla_real = "Componentes_Equipos"

        columnas = insp.get_columns(tabla_real)
        cols_lower = {c["name"].lower(): c for c in columnas}

        def _buscar_col(nombres_posibles):
            for n in nombres_posibles:
                if n in cols_lower:
                    return cols_lower[n]["name"]
            return None

        col_pk = _buscar_col(("id_componente", "id_componentes", "id"))
        if not col_pk and columnas:
            col_pk = columnas[0]["name"]

        col_fk = _buscar_col(("id_equipos", "id_equipo"))
        col_nombre = _buscar_col(
            ("nombre_componente", "nombre", "componente", "descripcion", "accesorio")
        )
        col_marca = _buscar_col(("marca", "fabricante"))
        col_modelo = _buscar_col(("modelo",))
        col_serie = _buscar_col(
            ("serie_referencia", "serie", "referencia", "serial", "codigo")
        )

        meta = {
            "tabla": tabla_real,
            "pk": col_pk,
            "fk": col_fk,
            "nombre": col_nombre,
            "marca": col_marca,
            "modelo": col_modelo,
            "serie": col_serie,
            "columnas_info": {c["name"]: c for c in columnas},
        }
        _META_COMPONENTES_CACHE["timestamp"] = ahora
        _META_COMPONENTES_CACHE["meta"] = meta
        return meta
    except Exception:
        return None


def _obtener_componentes_por_equipo(db: Session) -> dict:
    meta = _detectar_tabla_componentes()
    if not meta or not meta["fk"]:
        return {}
    try:
        filas = db.execute(text(f"SELECT * FROM `{meta['tabla']}`")).mappings().all()
        por_equipo = {}
        for r in filas:
            id_eq = r.get(meta["fk"])
            if id_eq is None:
                continue
            por_equipo.setdefault(int(id_eq), []).append(
                {
                    "id_componente": r.get(meta["pk"]) if meta["pk"] else None,
                    "nombre_componente": (
                        r.get(meta["nombre"]) if meta["nombre"] else ""
                    )
                    or "",
                    "marca": r.get(meta["marca"]) if meta["marca"] else None,
                    "modelo": r.get(meta["modelo"]) if meta["modelo"] else None,
                    "serie_referencia": r.get(meta["serie"]) if meta["serie"] else None,
                }
            )
        return por_equipo
    except Exception:
        return {}


def _guardar_componentes_equipo(
    db: Session,
    id_equipo: int,
    componentes: list,
    reemplazar: bool = False,
):
    meta = _detectar_tabla_componentes()
    if not meta or not meta["fk"] or not meta["nombre"]:
        return

    tabla = meta["tabla"]
    col_fk = meta["fk"]
    cols_info = meta["columnas_info"]

    if reemplazar:
        db.execute(
            text(f"DELETE FROM `{tabla}` WHERE `{col_fk}` = :id_eq"),
            {"id_eq": id_equipo},
        )

    for comp in componentes or []:
        nombre_val = (getattr(comp, "nombre_componente", None) or "").strip()
        if not nombre_val:
            continue

        valores = {col_fk: id_equipo, meta["nombre"]: nombre_val}

        if meta["marca"]:
            es_not_null = not cols_info[meta["marca"]].get("nullable", True)
            v_marca = (getattr(comp, "marca", None) or "").strip()
            valores[meta["marca"]] = v_marca if v_marca else ("" if es_not_null else None)

        if meta["modelo"]:
            es_not_null = not cols_info[meta["modelo"]].get("nullable", True)
            v_modelo = (getattr(comp, "modelo", None) or "").strip()
            valores[meta["modelo"]] = v_modelo if v_modelo else ("" if es_not_null else None)

        if meta["serie"]:
            es_not_null = not cols_info[meta["serie"]].get("nullable", True)
            v_serie = (getattr(comp, "serie_referencia", None) or "").strip()
            valores[meta["serie"]] = v_serie if v_serie else ("" if es_not_null else None)

        cols_sql = ", ".join(f"`{k}`" for k in valores.keys())
        params_sql = ", ".join(f":{k}" for k in valores.keys())
        db.execute(
            text(f"INSERT INTO `{tabla}` ({cols_sql}) VALUES ({params_sql})"),
            valores,
        )


# =======================================================
# SERIALIZADOR DE EQUIPO COMPLETO (HOJA DE VIDA MECATRÓNICA)
# =======================================================
def serializar_equipo(eq: Equipo, componentes_equipo: Optional[list] = None) -> dict:
    esp = eq.especificaciones

    # Verificar si tiene algún préstamo activo en Detalle_Prestamo -> Prestamos
    prestamos_activos = [
        dp
        for dp in (eq.detalles_prestamo or [])
        if dp.prestamo and (dp.prestamo.Estado or "").strip().lower() not in ("devuelto", "finalizado")
    ]
    en_prestamo = len(prestamos_activos) > 0 or (eq.Estado or "").strip().lower() in (
        "en préstamo",
        "en prestamo",
        "prestado",
    )

    # Filtrar solo fotografías generales del equipo (las que tienen Id_Mantenimiento == None)
    fotos_equipo = [
        img for img in (eq.imagenes or []) if img.Id_Mantenimiento is None
    ]

    valor_num = None
    if eq.Valor_Adquisicion is not None and str(eq.Valor_Adquisicion).strip() != "":
        limpio = re.sub(r"[^\d.]", "", str(eq.Valor_Adquisicion))
        try:
            valor_num = float(limpio) if limpio else None
        except ValueError:
            valor_num = None

    return {
        "id_equipo": eq.Id_Equipos,
        "nombre_equipo": eq.Nombre_Equipo,
        "marca": eq.Marca,
        "fabricante": eq.Marca,  # Alias de compatibilidad para vistas
        "modelo": eq.Modelo,
        "serie_equipo": eq.Serie,
        "serie_universidad": eq.U_Serie,
        "serie_laboratorio": eq.Lab_Serie,
        "estado": eq.Estado or "Disponible",
        "fecha_ingreso": eq.Fecha_Ingreso.isoformat() if eq.Fecha_Ingreso else None,
        "fecha_adquisicion": eq.Fecha_Ingreso.isoformat() if eq.Fecha_Ingreso else None,
        "observaciones": eq.Observaciones,
        "valor_adquisicion": valor_num if valor_num is not None else eq.Valor_Adquisicion,
        "valor_adquisicion_texto": eq.Valor_Adquisicion,
        "responsable_equipo": eq.Responsable_Equipo,
        "id_laboratorio": eq.Id_Laboratorio,
        "nombre_laboratorio": eq.laboratorio.Nombre_Laboratorio if eq.laboratorio else None,
        "id_sede": eq.laboratorio.Id_Sede if eq.laboratorio else None,
        "nombre_sede": (
            eq.laboratorio.sede.Nombre_Sede
            if eq.laboratorio and eq.laboratorio.sede
            else None
        ),
        "id_proveedor": eq.Id_Proveedor,
        "nombre_proveedor": eq.proveedor.Nombre if eq.proveedor else None,
        "id_tipo_adquisicion": eq.Id_Adquisicion,
        "adquisicion_descripcion": eq.adquisicion.Tipo if eq.adquisicion else None,
        "id_tecnologia": eq.Id_Tecnologia,
        "tecnologia_descripcion": eq.tecnologia.Tipo if eq.tecnologia else None,
        "id_fuente": eq.Id_Alimentacion,
        "fuente_descripcion": eq.alimentacion.Tipo if eq.alimentacion else None,
        "en_prestamo": en_prestamo,
        "total_mantenimientos": len(eq.mantenimientos or []),
        "especificaciones": (
            {
                "id_especificacion": esp.Id_Especificacion,
                "id_fuente": eq.Id_Alimentacion,
                "fuente_descripcion": eq.alimentacion.Tipo if eq.alimentacion else None,
                "id_tecnologia": eq.Id_Tecnologia,
                "tecnologia_descripcion": eq.tecnologia.Tipo if eq.tecnologia else None,
                "rango_voltaje": esp.Rango_Voltaje,
                "corriente": esp.Corriente,
                "frecuencia": esp.Frecuencia,
                "potencia": esp.Potencia,
                "dimensiones_mm": esp.Dimensiones_mm,
                "peso": esp.Peso,
                "senal_salida": esp.Senal_Salida,
            }
            if esp
            else {
                "id_especificacion": None,
                "id_fuente": eq.Id_Alimentacion,
                "fuente_descripcion": eq.alimentacion.Tipo if eq.alimentacion else None,
                "id_tecnologia": eq.Id_Tecnologia,
                "tecnologia_descripcion": eq.tecnologia.Tipo if eq.tecnologia else None,
                "rango_voltaje": None,
                "corriente": None,
                "frecuencia": None,
                "potencia": None,
                "dimensiones_mm": None,
                "peso": None,
                "senal_salida": None,
            }
        ),
        "componentes": componentes_equipo or [],
        "documentos": [
            {
                "id_documento": d.Id_Datasheet,
                "nombre_archivo": d.Nombre_Archivo,
                "nombre_tipo": f"Datasheet ({(d.Tipo or 'PDF').upper()})",
                "tipo": d.Tipo or "pdf",
                "fecha": d.Fecha.isoformat() if d.Fecha else None,
                "ruta_archivo_pdf": normalizar_ruta_publica(d.Ruta),
            }
            for d in (eq.datasheets or [])
        ],
        "imagenes": [
            {
                "id_imagen": img.Id_Imagen,
                "nombre_imagen": img.Nombre_Imagen,
                "descripcion_imagen": img.Descripcion or img.Nombre_Imagen,
                "tipo": img.Tipo,
                "fecha": img.Fecha.isoformat() if img.Fecha else None,
                "ruta_imagen": normalizar_ruta_publica(img.Ruta),
            }
            for img in fotos_equipo
        ],
    }


def _resolver_fks_obligatorias_equipo(payload: EquipoCreate, db: Session):
    """
    En Bases_de_Mecatronica, Id_Proveedor, Id_Adquisicion, Id_Tecnologia e Id_Alimentacion
    son NOT NULL en la tabla Equipos. Si el formulario envía None, asigna el primer registro
    disponible en cada tabla catálogo (o crea uno base si estuviera vacía).
    """
    id_prov = payload.id_proveedor
    if not id_prov:
        p = db.query(Proveedor).order_by(Proveedor.Id_Proveedor).first()
        if not p:
            p = Proveedor(Nombre="Proveedor General", NIT="000000000-0")
            db.add(p)
            db.flush()
        id_prov = p.Id_Proveedor

    id_adq = payload.id_tipo_adquisicion
    if not id_adq:
        a = db.query(TipoAdquisicion).order_by(TipoAdquisicion.Id_Adquisicion).first()
        if not a:
            a = TipoAdquisicion(Tipo="Compra")
            db.add(a)
            db.flush()
        id_adq = a.Id_Adquisicion

    id_tec = payload.id_tecnologia
    if not id_tec:
        t = db.query(Tecnologia).order_by(Tecnologia.Id_Tecnologia).first()
        if not t:
            t = Tecnologia(Tipo="Electrónico")
            db.add(t)
            db.flush()
        id_tec = t.Id_Tecnologia

    id_alim = payload.id_fuente
    if not id_alim:
        al = db.query(TipoAlimentacion).order_by(TipoAlimentacion.Id_Alimentacion).first()
        if not al:
            al = TipoAlimentacion(Tipo="Electricidad")
            db.add(al)
            db.flush()
        id_alim = al.Id_Alimentacion

    return id_prov, id_adq, id_tec, id_alim


# =======================================================
# MÓDULO 1 Y 2: INVENTARIO Y REGISTRO DE EQUIPO
# =======================================================
@app.get("/api/equipos")
def listar_equipos(
    id_sede: Optional[int] = None,
    id_laboratorio: Optional[int] = None,
    db: Session = Depends(get_db),
):
    try:
        query = db.query(Equipo).options(
            joinedload(Equipo.laboratorio).joinedload(Laboratorio.sede),
            joinedload(Equipo.adquisicion),
            joinedload(Equipo.proveedor),
            joinedload(Equipo.tecnologia),
            joinedload(Equipo.alimentacion),
            joinedload(Equipo.especificaciones),
            selectinload(Equipo.datasheets),
            selectinload(Equipo.imagenes),
            selectinload(Equipo.mantenimientos),
            selectinload(Equipo.detalles_prestamo).joinedload(DetallePrestamo.prestamo),
        )
        if id_laboratorio:
            query = query.filter(Equipo.Id_Laboratorio == id_laboratorio)
        elif id_sede:
            query = query.join(
                Laboratorio, Equipo.Id_Laboratorio == Laboratorio.Id_Laboratorio
            ).filter(Laboratorio.Id_Sede == id_sede)

        equipos = query.order_by(Equipo.Id_Equipos.desc()).all()
        componentes_map = _obtener_componentes_por_equipo(db)
        return [
            serializar_equipo(eq, componentes_map.get(eq.Id_Equipos, []))
            for eq in equipos
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar equipos: {str(e)}")


@app.post("/api/equipos")
def registrar_equipo(payload: EquipoCreate, db: Session = Depends(get_db)):
    try:
        _asegurar_identificacion_opcional()
        id_prov, id_adq, id_tec, id_alim = _resolver_fks_obligatorias_equipo(payload, db)
        marca_final = (payload.marca or payload.fabricante or "Sin marca").strip()
        fecha_final = payload.fecha_ingreso or payload.fecha_adquisicion or date.today()
        valor_str = (
            str(payload.valor_adquisicion).strip()
            if payload.valor_adquisicion is not None and str(payload.valor_adquisicion).strip() != ""
            else None
        )

        nuevo_equipo = Equipo(
            Id_Proveedor=id_prov,
            Id_Adquisicion=id_adq,
            Id_Tecnologia=id_tec,
            Id_Alimentacion=id_alim,
            Id_Laboratorio=payload.id_laboratorio,
            Nombre_Equipo=payload.nombre_equipo.strip(),
            Marca=marca_final,
            Modelo=(payload.modelo or "S/M").strip(),
            Serie=payload.serie_equipo.strip(),
            U_Serie=payload.serie_universidad.strip(),
            Lab_Serie=payload.serie_laboratorio.strip(),
            Estado=(payload.estado or "Disponible").strip(),
            Fecha_Ingreso=fecha_final,
            Observaciones=payload.observaciones.strip() if payload.observaciones else None,
            Valor_Adquisicion=valor_str,
            Responsable_Equipo=(
                payload.responsable_equipo.strip() if payload.responsable_equipo else None
            ),
        )
        db.add(nuevo_equipo)
        db.flush()

        if payload.especificaciones:
            esp_data = payload.especificaciones
            if any(
                v is not None and str(v).strip() != ""
                for v in esp_data.model_dump().values()
            ):
                db.add(
                    EspecificacionTecnica(
                        Id_Equipos=nuevo_equipo.Id_Equipos,
                        Rango_Voltaje=esp_data.rango_voltaje,
                        Corriente=esp_data.corriente,
                        Frecuencia=esp_data.frecuencia,
                        Potencia=esp_data.potencia,
                        Dimensiones_mm=esp_data.dimensiones_mm,
                        Peso=esp_data.peso,
                        Senal_Salida=esp_data.senal_salida,
                    )
                )

        if payload.componentes:
            _guardar_componentes_equipo(
                db, nuevo_equipo.Id_Equipos, payload.componentes, reemplazar=False
            )

        for doc in payload.documentos or []:
            if doc.ruta_archivo_pdf:
                nombre_arch = (
                    doc.nombre_archivo
                    or doc.ruta_archivo_pdf.split("/")[-1]
                    or "Datasheet.pdf"
                )
                db.add(
                    Datasheet(
                        Id_Equipos=nuevo_equipo.Id_Equipos,
                        Nombre_Archivo=nombre_arch,
                        Ruta=doc.ruta_archivo_pdf,
                        Tipo=doc.tipo or "pdf",
                        Fecha=datetime.now(),
                    )
                )

        for img in payload.imagenes or []:
            if img.ruta_imagen:
                nombre_img = (
                    img.nombre_imagen
                    or img.ruta_imagen.split("/")[-1]
                    or "Foto_Equipo.webp"
                )
                ext = Path(nombre_img).suffix.lstrip(".").lower() or "webp"
                db.add(
                    Imagen(
                        Id_Equipos=nuevo_equipo.Id_Equipos,
                        Id_Mantenimiento=None,
                        Nombre_Imagen=nombre_img[:150],
                        Ruta=img.ruta_imagen,
                        Tipo=img.tipo or ext,
                        Descripcion=img.descripcion_imagen or "Foto de Equipo",
                        Fecha=date.today(),
                    )
                )

        db.commit()
        db.refresh(nuevo_equipo)
        return {"mensaje": "Equipo registrado exitosamente", "id_equipo": nuevo_equipo.Id_Equipos}
    except Exception as e:
        db.rollback()
        err_str = str(e)
        if "Duplicate entry" in err_str:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un equipo registrado con esa Serie (Fábrica, Universidad o Laboratorio).",
            )
        raise HTTPException(status_code=500, detail=f"Error al registrar equipo: {err_str}")


@app.put("/api/equipos/{id_equipo}")
def actualizar_equipo(id_equipo: int, payload: EquipoCreate, db: Session = Depends(get_db)):
    eq = (
        db.query(Equipo)
        .options(joinedload(Equipo.especificaciones))
        .filter(Equipo.Id_Equipos == id_equipo)
        .first()
    )
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    try:
        id_prov, id_adq, id_tec, id_alim = _resolver_fks_obligatorias_equipo(payload, db)
        eq.Id_Proveedor = id_prov
        eq.Id_Adquisicion = id_adq
        eq.Id_Tecnologia = id_tec
        eq.Id_Alimentacion = id_alim
        eq.Id_Laboratorio = payload.id_laboratorio
        eq.Nombre_Equipo = payload.nombre_equipo.strip()
        eq.Marca = (payload.marca or payload.fabricante or eq.Marca or "Sin marca").strip()
        eq.Modelo = (payload.modelo or eq.Modelo or "S/M").strip()
        eq.Serie = payload.serie_equipo.strip()
        eq.U_Serie = payload.serie_universidad.strip()
        eq.Lab_Serie = payload.serie_laboratorio.strip()
        eq.Estado = (payload.estado or eq.Estado or "Disponible").strip()
        eq.Fecha_Ingreso = payload.fecha_ingreso or payload.fecha_adquisicion or eq.Fecha_Ingreso or date.today()
        eq.Observaciones = payload.observaciones.strip() if payload.observaciones else None
        eq.Valor_Adquisicion = (
            str(payload.valor_adquisicion).strip()
            if payload.valor_adquisicion is not None and str(payload.valor_adquisicion).strip() != ""
            else None
        )
        eq.Responsable_Equipo = (
            payload.responsable_equipo.strip() if payload.responsable_equipo else None
        )

        if payload.especificaciones is not None:
            esp_in = payload.especificaciones
            if eq.especificaciones:
                eq.especificaciones.Rango_Voltaje = esp_in.rango_voltaje
                eq.especificaciones.Corriente = esp_in.corriente
                eq.especificaciones.Frecuencia = esp_in.frecuencia
                eq.especificaciones.Potencia = esp_in.potencia
                eq.especificaciones.Dimensiones_mm = esp_in.dimensiones_mm
                eq.especificaciones.Peso = esp_in.peso
                eq.especificaciones.Senal_Salida = esp_in.senal_salida
            elif any(
                v is not None and str(v).strip() != "" for v in esp_in.model_dump().values()
            ):
                db.add(
                    EspecificacionTecnica(
                        Id_Equipos=eq.Id_Equipos,
                        Rango_Voltaje=esp_in.rango_voltaje,
                        Corriente=esp_in.corriente,
                        Frecuencia=esp_in.frecuencia,
                        Potencia=esp_in.potencia,
                        Dimensiones_mm=esp_in.dimensiones_mm,
                        Peso=esp_in.peso,
                        Senal_Salida=esp_in.senal_salida,
                    )
                )

        if payload.componentes is not None:
            _guardar_componentes_equipo(
                db, id_equipo, payload.componentes, reemplazar=True
            )

        db.commit()
        return {"mensaje": "Equipo actualizado correctamente", "id_equipo": eq.Id_Equipos}
    except Exception as e:
        db.rollback()
        err_str = str(e)
        if "Duplicate entry" in err_str:
            raise HTTPException(
                status_code=400,
                detail="Otro equipo ya tiene asignada esa Serie (Fábrica, Universidad o Laboratorio).",
            )
        raise HTTPException(status_code=500, detail=f"Error al actualizar equipo: {err_str}")


@app.post("/api/equipos/{id_equipo}/componentes")
def agregar_componente_equipo(
    id_equipo: int, payload: ComponenteEquipoBase, db: Session = Depends(get_db)
):
    _guardar_componentes_equipo(db, id_equipo, [payload], reemplazar=False)
    db.commit()
    return {"mensaje": "Componente agregado"}


@app.delete("/api/documentos/{id_documento}")
def eliminar_documento_equipo(id_documento: int, db: Session = Depends(get_db)):
    doc = db.query(Datasheet).filter(Datasheet.Id_Datasheet == id_documento).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Datasheet no encontrado")
    db.delete(doc)
    db.commit()
    return {"mensaje": "Datasheet eliminado"}


@app.delete("/api/imagenes/{id_imagen}")
def eliminar_imagen_equipo(id_imagen: int, db: Session = Depends(get_db)):
    img = db.query(Imagen).filter(Imagen.Id_Imagen == id_imagen).first()
    if not img:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    db.delete(img)
    db.commit()
    return {"mensaje": "Imagen eliminada"}


@app.post("/api/equipos/{id_equipo}/documentos")
def agregar_documento_equipo(
    id_equipo: int, payload: DocumentoEquipoBase, db: Session = Depends(get_db)
):
    nombre_arch = (
        payload.nombre_archivo
        or payload.ruta_archivo_pdf.split("/")[-1]
        or "Datasheet.pdf"
    )
    doc = Datasheet(
        Id_Equipos=id_equipo,
        Nombre_Archivo=nombre_arch,
        Ruta=payload.ruta_archivo_pdf,
        Tipo=payload.tipo or "pdf",
        Fecha=datetime.now(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id_documento": doc.Id_Datasheet, "ruta_archivo_pdf": normalizar_ruta_publica(doc.Ruta)}


@app.post("/api/equipos/{id_equipo}/imagenes")
def agregar_imagen_equipo(
    id_equipo: int, payload: ImagenEquipoBase, db: Session = Depends(get_db)
):
    nombre_img = (
        payload.nombre_imagen
        or payload.ruta_imagen.split("/")[-1]
        or "Foto_Equipo.webp"
    )
    ext = Path(nombre_img).suffix.lstrip(".").lower() or "webp"
    img = Imagen(
        Id_Equipos=id_equipo,
        Id_Mantenimiento=None,
        Nombre_Imagen=nombre_img[:150],
        Ruta=payload.ruta_imagen,
        Tipo=payload.tipo or ext,
        Descripcion=payload.descripcion_imagen or "Foto de Equipo",
        Fecha=date.today(),
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return {"id_imagen": img.Id_Imagen, "ruta_imagen": normalizar_ruta_publica(img.Ruta)}


@app.delete("/api/equipos/{id_equipo}")
def eliminar_equipo(id_equipo: int, db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.Id_Equipos == id_equipo).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    try:
        meta = _detectar_tabla_componentes()
        if meta and meta["fk"]:
            db.execute(
                text(f"DELETE FROM `{meta['tabla']}` WHERE `{meta['fk']}` = :id_eq"),
                {"id_eq": id_equipo},
            )
        # Limpiar dependencias con FK restrictiva (Imagenes, Mantenimiento, Detalle_Prestamo)
        db.query(Imagen).filter(Imagen.Id_Equipos == id_equipo).delete(synchronize_session=False)
        db.query(Mantenimiento).filter(Mantenimiento.Id_Equipos == id_equipo).delete(synchronize_session=False)
        db.query(DetallePrestamo).filter(DetallePrestamo.Id_Equipos == id_equipo).delete(synchronize_session=False)
        db.delete(eq)
        db.commit()
        return {"mensaje": "Equipo eliminado correctamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar el equipo: {str(e)}")


# =======================================================
# MÓDULO 3: REGISTRO DE MANTENIMIENTOS (TABLA Mantenimiento + Imagenes)
# =======================================================
@app.get("/api/mantenimientos")
def listar_mantenimientos(db: Session = Depends(get_db)):
    try:
        registros = (
            db.query(Mantenimiento)
            .options(
                joinedload(Mantenimiento.equipo).joinedload(Equipo.laboratorio),
                joinedload(Mantenimiento.tipo_mantenimiento),
                selectinload(Mantenimiento.evidencias),
            )
            .order_by(
                Mantenimiento.Fecha.desc(),
                Mantenimiento.Id_Mantenimiento.desc(),
            )
            .all()
        )
        resultado = []
        for r in registros:
            evidencia_principal = (r.evidencias or [None])[0]
            ruta_ev = normalizar_ruta_publica(evidencia_principal.Ruta) if evidencia_principal else None
            resultado.append(
                {
                    "id_registro_mantenimiento": r.Id_Mantenimiento,
                    "id_equipo": r.Id_Equipos,
                    "nombre_equipo": r.equipo.Nombre_Equipo if r.equipo else "Equipo eliminado",
                    "serie_equipo": r.equipo.Serie if r.equipo else None,
                    "serie_universidad": r.equipo.U_Serie if r.equipo else None,
                    "serie_laboratorio": r.equipo.Lab_Serie if r.equipo else None,
                    "id_laboratorio": r.equipo.Id_Laboratorio if r.equipo else None,
                    "nombre_laboratorio": (
                        r.equipo.laboratorio.Nombre_Laboratorio
                        if r.equipo and r.equipo.laboratorio
                        else None
                    ),
                    "id_tipo_mantenimiento": r.Id_TMantenimiento,
                    "tipo_mantenimiento": (
                        r.tipo_mantenimiento.Tipo_Mantenimiento
                        if r.tipo_mantenimiento
                        else "General"
                    ),
                    "fecha_mantenimiento": r.Fecha.isoformat() if r.Fecha else None,
                    "responsable_mantenimiento": r.Responsable,
                    "costo": float(r.Costo) if r.Costo is not None else 0.0,
                    "notas": r.Notas,
                    "ruta_evidencia": ruta_ev,
                    "ruta_evidencia_pdf": ruta_ev,
                    "evidencias": [
                        {
                            "id_imagen": ev.Id_Imagen,
                            "nombre_imagen": ev.Nombre_Imagen,
                            "ruta": normalizar_ruta_publica(ev.Ruta),
                            "tipo": ev.Tipo,
                            "descripcion": ev.Descripcion,
                        }
                        for ev in (r.evidencias or [])
                    ],
                }
            )
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar mantenimientos: {str(e)}")


@app.post("/api/mantenimientos")
def crear_mantenimiento(payload: MantenimientoCreate, db: Session = Depends(get_db)):
    try:
        id_tm = payload.id_tipo_mantenimiento
        if not id_tm:
            tm = db.query(TipoMantenimiento).order_by(TipoMantenimiento.Id_TMantenimiento).first()
            if not tm:
                tm = TipoMantenimiento(Tipo_Mantenimiento="Preventivos")
                db.add(tm)
                db.flush()
            id_tm = tm.Id_TMantenimiento

        nuevo = Mantenimiento(
            Id_Equipos=payload.id_equipo,
            Id_TMantenimiento=id_tm,
            Fecha=payload.fecha_mantenimiento,
            Responsable=(payload.responsable_mantenimiento or "Técnico de Laboratorio").strip(),
            Costo=payload.costo if payload.costo is not None else 0,
            Notas=payload.notas.strip() if payload.notas else None,
        )
        db.add(nuevo)
        db.flush()

        if payload.ruta_evidencia:
            nombre_arch = (
                payload.nombre_evidencia
                or payload.ruta_evidencia.split("/")[-1]
                or f"Evidencia_Mantenimiento_{nuevo.Id_Mantenimiento}"
            )
            ext = Path(nombre_arch).suffix.lstrip(".").lower() or "webp"
            db.add(
                Imagen(
                    Id_Equipos=payload.id_equipo,
                    Id_Mantenimiento=nuevo.Id_Mantenimiento,
                    Nombre_Imagen=nombre_arch[:150],
                    Ruta=payload.ruta_evidencia,
                    Tipo=ext,
                    Descripcion=payload.descripcion_evidencia or "Evidencia de Mantenimiento",
                    Fecha=payload.fecha_mantenimiento,
                )
            )

        db.commit()
        db.refresh(nuevo)
        return {
            "mensaje": "Mantenimiento registrado exitosamente",
            "id_registro_mantenimiento": nuevo.Id_Mantenimiento,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar mantenimiento: {str(e)}")


@app.delete("/api/mantenimientos/{id_registro}")
def eliminar_mantenimiento(id_registro: int, db: Session = Depends(get_db)):
    reg = db.query(Mantenimiento).filter(Mantenimiento.Id_Mantenimiento == id_registro).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")
    db.query(Imagen).filter(Imagen.Id_Mantenimiento == id_registro).delete(synchronize_session=False)
    db.delete(reg)
    db.commit()
    return {"mensaje": "Registro eliminado"}


# =======================================================
# MÓDULO 4: PRÉSTAMOS DE EQUIPOS (Prestamos + Detalle_Prestamo)
# =======================================================
def _parse_fecha_date(val) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return date.today()


@app.get("/api/prestamos")
def listar_prestamos(db: Session = Depends(get_db)):
    try:
        prestamos = (
            db.query(Prestamo)
            .options(
                selectinload(Prestamo.detalles)
                .joinedload(DetallePrestamo.equipo)
                .joinedload(Equipo.laboratorio)
            )
            .order_by(
                Prestamo.Fecha_Prestamo.desc(),
                Prestamo.Id_Prestamos.desc(),
            )
            .all()
        )
        filas = []
        for p in prestamos:
            detalles = p.detalles or []
            equipos_prestados = []
            for d in detalles:
                eq = d.equipo
                equipos_prestados.append(
                    {
                        "id_detalle": d.Id_Detalle,
                        "id_equipo": d.Id_Equipos,
                        "nombre_equipo": eq.Nombre_Equipo if eq else "Equipo eliminado",
                        "serie_equipo": eq.Serie if eq else None,
                        "serie_universidad": eq.U_Serie if eq else None,
                        "serie_laboratorio": eq.Lab_Serie if eq else None,
                        "id_laboratorio": eq.Id_Laboratorio if eq else None,
                        "nombre_laboratorio": (
                            eq.laboratorio.Nombre_Laboratorio
                            if eq and eq.laboratorio
                            else None
                        ),
                    }
                )

            primer_eq = equipos_prestados[0] if equipos_prestados else {}
            filas.append(
                {
                    "id_prestamo": p.Id_Prestamos,
                    "equipos_prestados": equipos_prestados,
                    "equipos_ids": [
                        e["id_equipo"] for e in equipos_prestados if e["id_equipo"] is not None
                    ],
                    "id_laboratorios": list(
                        {
                            e["id_laboratorio"]
                            for e in equipos_prestados
                            if e["id_laboratorio"] is not None
                        }
                    ),
                    "id_detalle": primer_eq.get("id_detalle"),
                    "id_equipo": primer_eq.get("id_equipo"),
                    "id_laboratorio": primer_eq.get("id_laboratorio"),
                    "nombre_laboratorio": primer_eq.get("nombre_laboratorio"),
                    "nombre_equipo": (
                        ", ".join(e["nombre_equipo"] for e in equipos_prestados)
                        if equipos_prestados
                        else "Sin equipo asociado"
                    ),
                    "serie_equipo": ", ".join(
                        e["serie_equipo"] for e in equipos_prestados if e.get("serie_equipo")
                    )
                    or None,
                    "serie_universidad": ", ".join(
                        e["serie_universidad"]
                        for e in equipos_prestados
                        if e.get("serie_universidad")
                    )
                    or None,
                    "serie_laboratorio": ", ".join(
                        e["serie_laboratorio"]
                        for e in equipos_prestados
                        if e.get("serie_laboratorio")
                    )
                    or None,
                    "codigo_estudiante": p.Codigo_Estudiante,
                    "codigo_universidad": p.Codigo_Estudiante,
                    "fecha_prestamo": p.Fecha_Prestamo.isoformat() if p.Fecha_Prestamo else None,
                    "fecha_hora_prestamo": p.Fecha_Prestamo.isoformat() if p.Fecha_Prestamo else None,
                    "fecha_devolucion": p.Fecha_Devolucion.isoformat() if p.Fecha_Devolucion else None,
                    "fecha_hora_devolucion": p.Fecha_Devolucion.isoformat() if p.Fecha_Devolucion else None,
                    "estado_prestamo": p.Estado or "Activo",
                    "observaciones": p.Observaciones,
                    "observaciones_entrega": p.Observaciones,
                }
            )
        return filas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar préstamos: {str(e)}")


@app.post("/api/prestamos")
def crear_prestamo(payload: PrestamoCreate, db: Session = Depends(get_db)):
    try:
        ids_equipos = list(payload.equipos_ids or [])
        if payload.id_equipo and payload.id_equipo not in ids_equipos:
            ids_equipos.append(payload.id_equipo)
        if not ids_equipos:
            raise HTTPException(status_code=400, detail="Debes seleccionar al menos un equipo.")

        codigo_est = payload.codigo_estudiante.strip()
        estado_limpio = (payload.estado_prestamo or "Activo").strip()
        fecha_p = _parse_fecha_date(payload.fecha_prestamo) or date.today()
        fecha_d = _parse_fecha_date(payload.fecha_devolucion)

        # Si el mismo estudiante ya tiene un préstamo Activo, agrupar los equipos en ese mismo préstamo
        prestamo_existente = None
        if estado_limpio.lower() == "activo":
            prestamo_existente = (
                db.query(Prestamo)
                .options(selectinload(Prestamo.detalles))
                .filter(
                    Prestamo.Codigo_Estudiante == codigo_est,
                    Prestamo.Estado == "Activo",
                )
                .order_by(Prestamo.Id_Prestamos.desc())
                .first()
            )

        if prestamo_existente:
            prestamo_destino = prestamo_existente
            if fecha_d:
                prestamo_destino.Fecha_Devolucion = fecha_d
            if payload.observaciones and payload.observaciones.strip():
                obs_nueva = payload.observaciones.strip()
                if prestamo_destino.Observaciones and obs_nueva not in prestamo_destino.Observaciones:
                    prestamo_destino.Observaciones = f"{prestamo_destino.Observaciones} | {obs_nueva}"[:255]
                else:
                    prestamo_destino.Observaciones = obs_nueva[:255]
            ids_actuales = {d.Id_Equipos for d in (prestamo_destino.detalles or [])}
        else:
            prestamo_destino = Prestamo(
                Codigo_Estudiante=codigo_est,
                Fecha_Prestamo=fecha_p,
                Fecha_Devolucion=fecha_d,
                Estado=estado_limpio,
                Observaciones=payload.observaciones.strip() if payload.observaciones else None,
            )
            db.add(prestamo_destino)
            db.flush()
            ids_actuales = set()

        es_devuelto = prestamo_destino.Estado.lower() in ("devuelto", "finalizado")
        for id_eq in ids_equipos:
            id_eq_int = int(id_eq)
            if id_eq_int not in ids_actuales:
                db.add(
                    DetallePrestamo(
                        Id_Prestamos=prestamo_destino.Id_Prestamos,
                        Id_Equipos=id_eq_int,
                    )
                )
                ids_actuales.add(id_eq_int)
            eq = db.query(Equipo).filter(Equipo.Id_Equipos == id_eq_int).first()
            if eq:
                eq.Estado = "Disponible" if es_devuelto else "En Préstamo"

        db.commit()
        db.refresh(prestamo_destino)
        return {
            "mensaje": "Préstamo registrado exitosamente",
            "id_prestamo": prestamo_destino.Id_Prestamos,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar préstamo: {str(e)}")


@app.put("/api/prestamos/{id_prestamo}")
def actualizar_prestamo(
    id_prestamo: int, payload: PrestamoCreate, db: Session = Depends(get_db)
):
    reg = (
        db.query(Prestamo)
        .options(selectinload(Prestamo.detalles))
        .filter(Prestamo.Id_Prestamos == id_prestamo)
        .first()
    )
    if not reg:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    try:
        ids_equipos = [int(x) for x in (payload.equipos_ids or [])]
        if payload.id_equipo and int(payload.id_equipo) not in ids_equipos:
            ids_equipos.append(int(payload.id_equipo))
        if not ids_equipos:
            raise HTTPException(status_code=400, detail="Debes mantener al menos un equipo en el préstamo.")

        ids_anteriores = {d.Id_Equipos for d in (reg.detalles or [])}
        ids_nuevos = set(ids_equipos)

        # Liberar equipos que fueron retirados del préstamo
        for id_removido in ids_anteriores - ids_nuevos:
            eq_rem = db.query(Equipo).filter(Equipo.Id_Equipos == id_removido).first()
            if eq_rem and (eq_rem.Estado or "").lower() in ("en préstamo", "en prestamo"):
                eq_rem.Estado = "Disponible"

        db.query(DetallePrestamo).filter(DetallePrestamo.Id_Prestamos == id_prestamo).delete(
            synchronize_session=False
        )

        reg.Codigo_Estudiante = payload.codigo_estudiante.strip()
        reg.Fecha_Prestamo = _parse_fecha_date(payload.fecha_prestamo) or reg.Fecha_Prestamo or date.today()
        reg.Fecha_Devolucion = _parse_fecha_date(payload.fecha_devolucion)
        reg.Estado = (payload.estado_prestamo or reg.Estado or "Activo").strip()
        reg.Observaciones = payload.observaciones.strip()[:255] if payload.observaciones else None

        es_devuelto = reg.Estado.lower() in ("devuelto", "finalizado")
        for id_eq in ids_equipos:
            db.add(
                DetallePrestamo(
                    Id_Prestamos=reg.Id_Prestamos,
                    Id_Equipos=id_eq,
                )
            )
            eq = db.query(Equipo).filter(Equipo.Id_Equipos == id_eq).first()
            if eq:
                eq.Estado = "Disponible" if es_devuelto else "En Préstamo"

        db.commit()
        return {"mensaje": "Préstamo actualizado correctamente", "id_prestamo": reg.Id_Prestamos}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar préstamo: {str(e)}")


@app.patch("/api/prestamos/{id_prestamo}/estado")
def actualizar_estado_prestamo(
    id_prestamo: int, payload: PrestamoEstadoUpdate, db: Session = Depends(get_db)
):
    reg = (
        db.query(Prestamo)
        .options(selectinload(Prestamo.detalles))
        .filter(Prestamo.Id_Prestamos == id_prestamo)
        .first()
    )
    if not reg:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    reg.Estado = payload.estado_prestamo
    if payload.fecha_devolucion:
        reg.Fecha_Devolucion = _parse_fecha_date(payload.fecha_devolucion)
    elif payload.estado_prestamo.lower() == "devuelto" and not reg.Fecha_Devolucion:
        reg.Fecha_Devolucion = date.today()

    if payload.observaciones is not None and payload.observaciones.strip():
        reg.Observaciones = payload.observaciones.strip()[:255]

    es_devuelto = reg.Estado.lower() in ("devuelto", "finalizado")
    for det in reg.detalles or []:
        eq = db.query(Equipo).filter(Equipo.Id_Equipos == det.Id_Equipos).first()
        if eq:
            eq.Estado = "Disponible" if es_devuelto else "En Préstamo"

    db.commit()
    return {"mensaje": "Estado de préstamo actualizado"}


@app.delete("/api/prestamos/{id_prestamo}")
def eliminar_prestamo(id_prestamo: int, db: Session = Depends(get_db)):
    reg = (
        db.query(Prestamo)
        .options(selectinload(Prestamo.detalles))
        .filter(Prestamo.Id_Prestamos == id_prestamo)
        .first()
    )
    if not reg:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")

    for det in reg.detalles or []:
        eq = db.query(Equipo).filter(Equipo.Id_Equipos == det.Id_Equipos).first()
        if eq and (eq.Estado or "").lower() in ("en préstamo", "en prestamo"):
            eq.Estado = "Disponible"

    db.query(DetallePrestamo).filter(DetallePrestamo.Id_Prestamos == id_prestamo).delete(
        synchronize_session=False
    )
    db.delete(reg)
    db.commit()
    return {"mensaje": "Préstamo eliminado"}


# =======================================================
# MÓDULO DE USUARIOS, ROLES Y AUTENTICACIÓN
# =======================================================
def encriptar_contrasena(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verificar_contrasena(password: str, stored_hash: str) -> bool:
    salt = "labora_auth_salt_2026"
    calculado_pbkdf2 = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()
    calculado_sha256 = hashlib.sha256(password.encode("utf-8")).hexdigest()
    # Soportar tanto admin2026 como admin2026@ si el hash guardado es el de admin2026
    pwd_sin_arroba = password[:-1] if password.endswith("@") else password
    sha_sin_arroba = hashlib.sha256(pwd_sin_arroba.encode("utf-8")).hexdigest()
    return (
        hmac.compare_digest(calculado_pbkdf2, stored_hash)
        or hmac.compare_digest(calculado_sha256, stored_hash.lower())
        or hmac.compare_digest(sha_sin_arroba, stored_hash.lower())
        or hmac.compare_digest(password, stored_hash)
    )


@app.get("/api/roles")
def listar_roles(db: Session = Depends(get_db)):
    try:
        roles = db.query(Rol).order_by(Rol.Id_Rol).all()
        return [
            {
                "id_rol": r.Id_Rol,
                "nombre_rol": r.Nombre_Rol,
                "permiso_escritura": bool(r.Permiso_Escritura),
                "descripcion": (
                    "Control total y escritura en el sistema"
                    if r.Permiso_Escritura
                    else "Solo consulta / sin escritura"
                ),
            }
            for r in roles
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar roles: {str(e)}")


@app.post("/api/roles")
def crear_rol(payload: RolCreate, db: Session = Depends(get_db)):
    es_lectura = payload.nombre_rol.strip().lower() in ("estudiante", "consulta", "lector")
    permiso = False if es_lectura else bool(payload.permiso_escritura)
    nuevo = Rol(Nombre_Rol=payload.nombre_rol.strip(), Permiso_Escritura=permiso)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {
        "id_rol": nuevo.Id_Rol,
        "nombre_rol": nuevo.Nombre_Rol,
        "permiso_escritura": bool(nuevo.Permiso_Escritura),
        "descripcion": (
            "Control total y escritura en el sistema"
            if nuevo.Permiso_Escritura
            else "Solo consulta / sin escritura"
        ),
    }


@app.get("/api/usuarios")
def listar_usuarios(db: Session = Depends(get_db)):
    try:
        usuarios = (
            db.query(Usuario)
            .options(joinedload(Usuario.rol))
            .order_by(Usuario.Id_Usuario.desc())
            .all()
        )
        return [
            {
                "id_usuario": u.Id_Usuario,
                "nombre_completo": u.Nombre,
                "correo_electronico": u.Correo,
                "id_rol": u.Id_Rol,
                "nombre_rol": u.rol.Nombre_Rol if u.rol else "Sin rol",
                "permiso_escritura": bool(u.rol.Permiso_Escritura) if u.rol else False,
                "estado": u.Estado or "Activo",
            }
            for u in usuarios
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar usuarios: {str(e)}")


@app.post("/api/usuarios")
def crear_usuario(payload: UsuarioCreate, db: Session = Depends(get_db)):
    existente = (
        db.query(Usuario)
        .filter(Usuario.Correo == payload.correo_electronico.strip().lower())
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo electrónico")

    nuevo = Usuario(
        Nombre=payload.nombre_completo.strip(),
        Correo=payload.correo_electronico.strip().lower(),
        Password_Hash=encriptar_contrasena(payload.contrasena),
        Id_Rol=payload.id_rol,
        Estado=payload.estado or "Activo",
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Usuario creado correctamente", "id_usuario": nuevo.Id_Usuario}


@app.patch("/api/usuarios/{id_usuario}")
def actualizar_usuario(
    id_usuario: int, payload: UsuarioEstadoUpdate, db: Session = Depends(get_db)
):
    u = db.query(Usuario).filter(Usuario.Id_Usuario == id_usuario).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u.Estado = payload.estado
    if payload.id_rol is not None:
        u.Id_Rol = payload.id_rol
    db.commit()
    return {"mensaje": "Usuario actualizado"}


@app.delete("/api/usuarios/{id_usuario}")
def eliminar_usuario(id_usuario: int, db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.Id_Usuario == id_usuario).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(u)
    db.commit()
    return {"mensaje": "Usuario eliminado"}


@app.post("/api/auth/login")
def iniciar_sesion(payload: LoginRequest, db: Session = Depends(get_db)):
    identificador = payload.correo_electronico.strip()
    identificador_lower = identificador.lower()

    query = db.query(Usuario).options(joinedload(Usuario.rol))
    usuario = query.filter(
        or_(
            Usuario.Correo == identificador_lower,
            Usuario.Nombre == identificador,
        )
    ).first()

    # Si escribe "admin", buscar el primer administrador activo (ej. admin@unisimon.edu.co)
    if not usuario and identificador_lower == "admin":
        usuario = query.filter(Usuario.Id_Rol == 1).first()

    if not usuario or not verificar_contrasena(payload.contrasena, usuario.Password_Hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    if (usuario.Estado or "Activo") != "Activo":
        raise HTTPException(status_code=403, detail="Esta cuenta se encuentra inactiva")

    nombre_rol = usuario.rol.Nombre_Rol if usuario.rol else "Consulta"
    permiso_escritura = bool(usuario.rol.Permiso_Escritura) if usuario.rol else False
    if nombre_rol.strip().lower() in ("estudiante", "consulta") and not permiso_escritura:
        raise HTTPException(
            status_code=403,
            detail="Acceso restringido: este rol es de solo consulta y no tiene permisos de administración",
        )

    return {
        "id_usuario": usuario.Id_Usuario,
        "nombre_completo": usuario.Nombre,
        "correo_electronico": usuario.Correo,
        "id_rol": usuario.Id_Rol,
        "nombre_rol": nombre_rol,
        "estado": usuario.Estado,
    }


FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)

