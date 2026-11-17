from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    Text,
    Numeric,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


# =======================================================
# JERARQUÍA Y UBICACIÓN
# =======================================================
class Sede(Base):
    __tablename__ = "Sedes"

    Id_Sede = Column(Integer, primary_key=True, autoincrement=True)
    Nombre_Sede = Column(String(100), nullable=False)

    laboratorios = relationship("Laboratorio", back_populates="sede", cascade="all, delete-orphan")


class Laboratorio(Base):
    __tablename__ = "Laboratorios"

    Id_Laboratorio = Column(Integer, primary_key=True, autoincrement=True)
    Id_Sede = Column(Integer, ForeignKey("Sedes.Id_Sede", ondelete="CASCADE"), nullable=False)
    Nombre_Laboratorio = Column(String(100), nullable=False)

    sede = relationship("Sede", back_populates="laboratorios")
    equipos = relationship("Equipo", back_populates="laboratorio")


# =======================================================
# TABLAS DE CATÁLOGO Y SOPORTE COMERCIAL
# =======================================================
class Proveedor(Base):
    __tablename__ = "Proveedor"

    Id_Proveedor = Column(Integer, primary_key=True, autoincrement=True)
    Nombre = Column(String(100), nullable=False)
    NIT = Column(String(30), nullable=False)
    Telefono = Column(String(30), nullable=True)
    Correo = Column(String(100), nullable=True)
    Direccion = Column(String(200), nullable=True)
    Origen = Column(String(100), nullable=True)


class TipoAdquisicion(Base):
    __tablename__ = "Tipo_de_adquisicion"

    Id_Adquisicion = Column(Integer, primary_key=True, autoincrement=True)
    Tipo = Column(String(100), nullable=False)


class Tecnologia(Base):
    __tablename__ = "Tecnologia"

    Id_Tecnologia = Column(Integer, primary_key=True, autoincrement=True)
    Tipo = Column(String(100), nullable=False)


class TipoAlimentacion(Base):
    __tablename__ = "Tipo_de_alimentacion"

    Id_Alimentacion = Column(Integer, primary_key=True, autoincrement=True)
    Tipo = Column(String(100), nullable=False)


class TipoMantenimiento(Base):
    __tablename__ = "Tipo_de_mantenimiento"

    Id_TMantenimiento = Column(Integer, primary_key=True, autoincrement=True)
    Tipo_Mantenimiento = Column(String(100), nullable=False)
    Descripcion = Column(String(255), nullable=True)


# =======================================================
# TABLA PRINCIPAL DE EQUIPOS (MECATRÓNICA)
# =======================================================
class Equipo(Base):
    __tablename__ = "Equipos"

    Id_Equipos = Column(Integer, primary_key=True, autoincrement=True)
    Id_Proveedor = Column(Integer, ForeignKey("Proveedor.Id_Proveedor"), nullable=False)
    Id_Adquisicion = Column(Integer, ForeignKey("Tipo_de_adquisicion.Id_Adquisicion"), nullable=False)
    Id_Tecnologia = Column(Integer, ForeignKey("Tecnologia.Id_Tecnologia"), nullable=False)
    Id_Alimentacion = Column(Integer, ForeignKey("Tipo_de_alimentacion.Id_Alimentacion"), nullable=False)
    Id_Laboratorio = Column(
        Integer, ForeignKey("Laboratorios.Id_Laboratorio", ondelete="SET NULL"), nullable=True
    )

    Nombre_Equipo = Column(String(100), nullable=False)
    Marca = Column(String(100), nullable=False)
    Modelo = Column(String(100), nullable=False)
    Serie = Column(String(100), nullable=False, unique=True)
    Estado = Column(String(50), nullable=False, default="Disponible")
    Fecha_Ingreso = Column(Date, nullable=False)
    Observaciones = Column(String(255), nullable=True)
    U_Serie = Column(String(100), nullable=False, unique=True)
    Lab_Serie = Column(String(100), nullable=False, unique=True)
    Valor_Adquisicion = Column(String(100), nullable=True)
    Responsable_Equipo = Column(String(150), nullable=True)

    laboratorio = relationship("Laboratorio", back_populates="equipos")
    proveedor = relationship("Proveedor")
    adquisicion = relationship("TipoAdquisicion")
    tecnologia = relationship("Tecnologia")
    alimentacion = relationship("TipoAlimentacion")

    especificaciones = relationship(
        "EspecificacionTecnica",
        back_populates="equipo",
        uselist=False,
        cascade="all, delete-orphan",
    )
    datasheets = relationship(
        "Datasheet",
        back_populates="equipo",
        cascade="all, delete-orphan",
    )
    imagenes = relationship(
        "Imagen",
        back_populates="equipo",
        cascade="all, delete-orphan",
    )
    mantenimientos = relationship(
        "Mantenimiento",
        back_populates="equipo",
        cascade="all, delete-orphan",
    )
    detalles_prestamo = relationship(
        "DetallePrestamo",
        back_populates="equipo",
        cascade="all, delete-orphan",
    )


# =======================================================
# ESPECIFICACIONES TÉCNICAS (RELACIÓN 1:1)
# =======================================================
class EspecificacionTecnica(Base):
    __tablename__ = "Especificaciones_Tecnicas"

    Id_Especificacion = Column(Integer, primary_key=True, autoincrement=True)
    Id_Equipos = Column(
        Integer, ForeignKey("Equipos.Id_Equipos", ondelete="CASCADE"), unique=True, nullable=False
    )
    Rango_Voltaje = Column(String(100), nullable=True)
    Corriente = Column(String(100), nullable=True)
    Frecuencia = Column(String(100), nullable=True)
    Potencia = Column(String(100), nullable=True)
    Dimensiones_mm = Column(String(100), nullable=True)
    Peso = Column(String(100), nullable=True)
    Senal_Salida = Column(String(100), nullable=True)

    equipo = relationship("Equipo", back_populates="especificaciones")


# =======================================================
# DATASHEETS, IMÁGENES, MANTENIMIENTO Y PRÉSTAMOS
# =======================================================
class Datasheet(Base):
    __tablename__ = "Datasheets"

    Id_Datasheet = Column(Integer, primary_key=True, autoincrement=True)
    Id_Equipos = Column(Integer, ForeignKey("Equipos.Id_Equipos", ondelete="CASCADE"), nullable=False)
    Nombre_Archivo = Column(String(255), nullable=False)
    Ruta = Column(String(255), nullable=False)
    Tipo = Column(String(50), default="pdf")
    Fecha = Column(DateTime, default=datetime.now)

    equipo = relationship("Equipo", back_populates="datasheets")


class Mantenimiento(Base):
    __tablename__ = "Mantenimiento"

    Id_Mantenimiento = Column(Integer, primary_key=True, autoincrement=True)
    Id_Equipos = Column(Integer, ForeignKey("Equipos.Id_Equipos"), nullable=False)
    Id_TMantenimiento = Column(
        Integer, ForeignKey("Tipo_de_mantenimiento.Id_TMantenimiento"), nullable=False
    )
    Fecha = Column(Date, nullable=False)
    Responsable = Column(String(100), nullable=False)
    Costo = Column(Numeric(10, 2), nullable=False, default=0)
    Notas = Column(Text, nullable=True)

    equipo = relationship("Equipo", back_populates="mantenimientos")
    tipo_mantenimiento = relationship("TipoMantenimiento")
    evidencias = relationship("Imagen", back_populates="mantenimiento")


class Imagen(Base):
    __tablename__ = "Imagenes"

    Id_Imagen = Column(Integer, primary_key=True, autoincrement=True)
    Id_Equipos = Column(Integer, ForeignKey("Equipos.Id_Equipos"), nullable=False)
    Id_Mantenimiento = Column(
        Integer, ForeignKey("Mantenimiento.Id_Mantenimiento"), nullable=True
    )
    Nombre_Imagen = Column(String(150), nullable=False)
    Ruta = Column(String(255), nullable=False)
    Tipo = Column(String(50), nullable=False, default="webp")
    Descripcion = Column(String(255), nullable=True)
    Fecha = Column(Date, nullable=False)

    equipo = relationship("Equipo", back_populates="imagenes")
    mantenimiento = relationship("Mantenimiento", back_populates="evidencias")


class Prestamo(Base):
    __tablename__ = "Prestamos"

    Id_Prestamos = Column(Integer, primary_key=True, autoincrement=True)
    Codigo_Estudiante = Column(String(30), nullable=False)
    Fecha_Prestamo = Column(Date, nullable=False)
    Fecha_Devolucion = Column(Date, nullable=True)
    Estado = Column(String(50), nullable=False, default="Activo")
    Observaciones = Column(String(255), nullable=True)

    detalles = relationship(
        "DetallePrestamo",
        back_populates="prestamo",
        cascade="all, delete-orphan",
    )


class DetallePrestamo(Base):
    __tablename__ = "Detalle_Prestamo"

    Id_Detalle = Column(Integer, primary_key=True, autoincrement=True)
    Id_Prestamos = Column(Integer, ForeignKey("Prestamos.Id_Prestamos"), nullable=False)
    Id_Equipos = Column(Integer, ForeignKey("Equipos.Id_Equipos"), nullable=False)

    prestamo = relationship("Prestamo", back_populates="detalles")
    equipo = relationship("Equipo", back_populates="detalles_prestamo")


# =======================================================
# MÓDULO DE USUARIOS Y ROLES (AUTENTICACIÓN)
# =======================================================
class Rol(Base):
    __tablename__ = "Roles"

    Id_Rol = Column(Integer, primary_key=True, autoincrement=True)
    Nombre_Rol = Column(String(50), nullable=False)
    Permiso_Escritura = Column(Boolean, default=True)

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "Usuarios"

    Id_Usuario = Column(Integer, primary_key=True, autoincrement=True)
    Nombre = Column(String(100), nullable=False)
    Correo = Column(String(150), unique=True, nullable=False)
    Password_Hash = Column(String(255), nullable=False)
    Id_Rol = Column(Integer, ForeignKey("Roles.Id_Rol"), nullable=False)
    Estado = Column(String(20), default="Activo")

    rol = relationship("Rol", back_populates="usuarios")
