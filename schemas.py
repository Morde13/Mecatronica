from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Union
from pydantic import BaseModel


# =======================================================
# ESQUEMAS DE UBICACIÓN Y CATÁLOGOS
# =======================================================
class SedeCreate(BaseModel):
    nombre_sede: str


class LaboratorioCreate(BaseModel):
    nombre_laboratorio: str
    id_sede: Optional[int] = None


class CatalogoSimpleCreate(BaseModel):
    valor: str
    descripcion: Optional[str] = None


class ProveedorCreate(BaseModel):
    nombre_proveedor: str
    nit: Optional[str] = ""
    correo_electronico: Optional[str] = None
    direccion: Optional[str] = None
    pais_origen: Optional[str] = None
    telefono: Optional[str] = None


# =======================================================
# ESPECIFICACIONES TÉCNICAS Y ARCHIVOS DE EQUIPO
# =======================================================
class EspecificacionTecnicaBase(BaseModel):
    rango_voltaje: Optional[str] = None
    corriente: Optional[str] = None
    frecuencia: Optional[str] = None
    potencia: Optional[str] = None
    dimensiones_mm: Optional[str] = None
    peso: Optional[str] = None
    senal_salida: Optional[str] = None


class DocumentoEquipoBase(BaseModel):
    nombre_archivo: Optional[str] = None
    ruta_archivo_pdf: str
    tipo: Optional[str] = "pdf"


class ImagenEquipoBase(BaseModel):
    nombre_imagen: Optional[str] = None
    descripcion_imagen: Optional[str] = None
    ruta_imagen: str
    tipo: Optional[str] = "webp"


class ComponenteEquipoBase(BaseModel):
    nombre_componente: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie_referencia: Optional[str] = None


# =======================================================
# EQUIPO PRINCIPAL (HOJA DE VIDA MECATRÓNICA)
# =======================================================
class EquipoCreate(BaseModel):
    nombre_equipo: str
    marca: Optional[str] = None
    fabricante: Optional[str] = None  # Alias por compatibilidad con componentes
    modelo: str
    serie_equipo: Optional[str] = "N/A"  # Se guarda en Equipos.Serie (se puede repetir)
    serie_universidad: Optional[str] = "N/A"  # Se guarda en Equipos.U_Serie (si no se registra queda N/A)
    serie_laboratorio: str  # Obligatorio y único en Equipos.Lab_Serie
    identificacion: Optional[str] = None  # Opcional por compatibilidad
    estado: Optional[str] = "Disponible"
    fecha_ingreso: Optional[date] = None
    fecha_adquisicion: Optional[date] = None  # Alias compatible
    observaciones: Optional[str] = None
    valor_adquisicion: Optional[Union[str, float, Decimal]] = None
    responsable_equipo: Optional[str] = None

    id_laboratorio: Optional[int] = None
    id_proveedor: Optional[int] = None
    id_tipo_adquisicion: Optional[int] = None
    id_tecnologia: Optional[int] = None
    id_fuente: Optional[int] = None  # Se guarda en Equipos.Id_Alimentacion

    especificaciones: Optional[EspecificacionTecnicaBase] = None
    componentes: Optional[List[ComponenteEquipoBase]] = []
    documentos: Optional[List[DocumentoEquipoBase]] = []
    imagenes: Optional[List[ImagenEquipoBase]] = []


# =======================================================
# MANTENIMIENTOS Y PRÉSTAMOS (MECATRÓNICA)
# =======================================================
class MantenimientoCreate(BaseModel):
    id_equipo: int
    id_tipo_mantenimiento: int
    fecha_mantenimiento: date
    responsable_mantenimiento: str
    costo: Optional[Decimal] = Decimal("0.00")
    notas: Optional[str] = None
    ruta_evidencia: Optional[str] = None
    nombre_evidencia: Optional[str] = None
    descripcion_evidencia: Optional[str] = None


class PrestamoCreate(BaseModel):
    id_equipo: Optional[int] = None
    equipos_ids: Optional[List[int]] = None
    codigo_estudiante: str
    fecha_prestamo: Union[date, datetime, str]
    fecha_devolucion: Optional[Union[date, datetime, str]] = None
    estado_prestamo: str = "Activo"
    observaciones: Optional[str] = None


class PrestamoEstadoUpdate(BaseModel):
    estado_prestamo: str
    fecha_devolucion: Optional[Union[date, datetime, str]] = None
    observaciones: Optional[str] = None


# =======================================================
# MÓDULO DE USUARIOS Y ROLES (AUTENTICACIÓN)
# =======================================================
class RolCreate(BaseModel):
    nombre_rol: str
    permiso_escritura: Optional[bool] = True
    descripcion: Optional[str] = None


class UsuarioCreate(BaseModel):
    nombre_completo: str
    correo_electronico: str
    contrasena: str
    id_rol: int
    estado: Optional[str] = "Activo"


class UsuarioEstadoUpdate(BaseModel):
    estado: str
    id_rol: Optional[int] = None


class LoginRequest(BaseModel):
    correo_electronico: str
    contrasena: str
