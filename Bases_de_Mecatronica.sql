-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 15, 2026 at 09:13 PM
-- Server version: 11.8.6-MariaDB-0+deb13u1 from Debian
-- PHP Version: 8.4.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `Bases_de_Mecatronica`
--

-- --------------------------------------------------------

--
-- Table structure for table `Datasheets`
--

CREATE TABLE `Datasheets` (
  `Id_Datasheet` int(11) NOT NULL,
  `Id_Equipos` int(11) NOT NULL,
  `Nombre_Archivo` varchar(255) NOT NULL,
  `Ruta` varchar(255) NOT NULL,
  `Tipo` varchar(50) DEFAULT 'pdf',
  `Fecha` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Datasheets`
--

INSERT INTO `Datasheets` (`Id_Datasheet`, `Id_Equipos`, `Nombre_Archivo`, `Ruta`, `Tipo`, `Fecha`) VALUES
(1, 2, 'Robot_colaborativo_DOBOT_MG400_2026-07-30_163503_v1.pdf', 'uploads/datasheets/Robot_colaborativo_DOBOT_MG400_2026-07-30_163503_v1.pdf', 'pdf', '2026-07-30 21:35:03'),
(2, 2, 'Robot_colaborativo_DOBOT_MG400_2026-07-30_163504_v1.pdf', 'uploads/datasheets/Robot_colaborativo_DOBOT_MG400_2026-07-30_163504_v1.pdf', 'pdf', '2026-07-30 21:35:04'),
(3, 2, 'Robot_colaborativo_DOBOT_MG400_2026-07-30_163504_v2.pdf', 'uploads/datasheets/Robot_colaborativo_DOBOT_MG400_2026-07-30_163504_v2.pdf', 'pdf', '2026-07-30 21:35:04'),
(4, 4, 'Fuente_de_alimentacion_2026-07-31_173945.pdf', 'uploads/datasheets/Fuente_de_alimentacion_2026-07-31_173945.pdf', 'pdf', '2026-07-31 22:39:45');

-- --------------------------------------------------------

--
-- Table structure for table `Detalle_Prestamo`
--

CREATE TABLE `Detalle_Prestamo` (
  `Id_Detalle` int(11) NOT NULL,
  `Id_Prestamos` int(11) NOT NULL,
  `Id_Equipos` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Componentes_Equipos`
--

CREATE TABLE `Componentes_Equipos` (
  `Id_Componente` int(11) NOT NULL AUTO_INCREMENT,
  `Id_Equipos` int(11) NOT NULL,
  `Nombre_Componente` varchar(150) NOT NULL,
  `Marca` varchar(100) DEFAULT NULL,
  `Modelo` varchar(100) DEFAULT NULL,
  `Serie_Referencia` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`Id_Componente`),
  KEY `fk_Equipos_Componentes` (`Id_Equipos`),
  CONSTRAINT `fk_Equipos_Componentes` FOREIGN KEY (`Id_Equipos`) REFERENCES `Equipos` (`Id_Equipos`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Equipos`
--

CREATE TABLE `Equipos` (
  `Id_Equipos` int(11) NOT NULL,
  `Id_Proveedor` int(11) NOT NULL,
  `Id_Adquisicion` int(11) NOT NULL,
  `Id_Tecnologia` int(11) NOT NULL,
  `Id_Alimentacion` int(11) NOT NULL,
  `Id_Laboratorio` int(11) DEFAULT NULL,
  `Nombre_Equipo` varchar(100) NOT NULL,
  `Marca` varchar(100) NOT NULL,
  `Modelo` varchar(100) NOT NULL,
  `Serie` varchar(100) NOT NULL,
  `Estado` varchar(50) NOT NULL,
  `Fecha_Ingreso` date NOT NULL,
  `Observaciones` varchar(255) DEFAULT NULL,
  `U_Serie` varchar(100) NOT NULL,
  `Lab_Serie` varchar(100) NOT NULL,
  `Valor_Adquisicion` varchar(100) DEFAULT NULL,
  `Responsable_Equipo` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Equipos`
--

INSERT INTO `Equipos` (`Id_Equipos`, `Id_Proveedor`, `Id_Adquisicion`, `Id_Tecnologia`, `Id_Alimentacion`, `Id_Laboratorio`, `Nombre_Equipo`, `Marca`, `Modelo`, `Serie`, `Estado`, `Fecha_Ingreso`, `Observaciones`, `U_Serie`, `Lab_Serie`, `Valor_Adquisicion`, `Responsable_Equipo`) VALUES
(2, 1, 1, 1, 1, NULL, 'Robot colaborativo DOBOT MG400', 'DOBOT', 'MG400', '6970632060045', 'Disponible', '2022-08-31', 'Se le realizo mantenimiento correctivo ', '01', 'MEC001', NULL, NULL),
(3, 1, 1, 1, 1, NULL, 'Monitor', '10012', '102', '12', 'Disponible', '2026-07-31', '', '290', '12390', '', ''),
(4, 1, 1, 2, 1, NULL, 'Fuente de alimentacion', 'Gwinsterk ', 'GPE-3232', '10012', 'Disponible', '2026-07-31', 'prueba', '100022', 'MEC0012', '1500000', 'Juan');

-- --------------------------------------------------------

--
-- Table structure for table `Especificaciones_Tecnicas`
--

CREATE TABLE `Especificaciones_Tecnicas` (
  `Id_Especificacion` int(11) NOT NULL,
  `Id_Equipos` int(11) NOT NULL,
  `Rango_Voltaje` varchar(100) DEFAULT NULL,
  `Corriente` varchar(100) DEFAULT NULL,
  `Frecuencia` varchar(100) DEFAULT NULL,
  `Potencia` varchar(100) DEFAULT NULL,
  `Dimensiones_mm` varchar(100) DEFAULT NULL,
  `Peso` varchar(100) DEFAULT NULL,
  `Senal_Salida` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Especificaciones_Tecnicas`
--

INSERT INTO `Especificaciones_Tecnicas` (`Id_Especificacion`, `Id_Equipos`, `Rango_Voltaje`, `Corriente`, `Frecuencia`, `Potencia`, `Dimensiones_mm`, `Peso`, `Senal_Salida`) VALUES
(1, 3, '110', '', '', '', '', '', NULL),
(2, 4, '220 V', '5A', '', '10000w', '300X200X100', '50g', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Imagenes`
--

CREATE TABLE `Imagenes` (
  `Id_Imagen` int(11) NOT NULL,
  `Id_Equipos` int(11) NOT NULL,
  `Id_Mantenimiento` int(11) DEFAULT NULL,
  `Nombre_Imagen` varchar(150) NOT NULL,
  `Ruta` varchar(255) NOT NULL,
  `Tipo` varchar(50) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `Fecha` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Imagenes`
--

INSERT INTO `Imagenes` (`Id_Imagen`, `Id_Equipos`, `Id_Mantenimiento`, `Nombre_Imagen`, `Ruta`, `Tipo`, `Descripcion`, `Fecha`) VALUES
(1, 2, NULL, 'imagen_Robot_colaborativo_DOBOT_MG400_id2_1_20260730_163503_882496.jpeg', 'uploads/imagenes/general/imagen_Robot_colaborativo_DOBOT_MG400_id2_1_20260730_163503_882496.jpeg', 'jpeg', 'Foto de Equipo', '2026-07-30'),
(2, 2, NULL, 'imagen_Robot_colaborativo_DOBOT_MG400_id2_2_20260730_163503_887069.jpeg', 'uploads/imagenes/general/imagen_Robot_colaborativo_DOBOT_MG400_id2_2_20260730_163503_887069.jpeg', 'jpeg', 'Foto de Equipo', '2026-07-30'),
(3, 2, NULL, 'imagen_Robot_colaborativo_DOBOT_MG400_id2_3_20260730_163503_891102.jpeg', 'uploads/imagenes/general/imagen_Robot_colaborativo_DOBOT_MG400_id2_3_20260730_163503_891102.jpeg', 'jpeg', 'Foto de Equipo', '2026-07-30'),
(4, 2, NULL, 'imagen_Robot_colaborativo_DOBOT_MG400_id2_4_20260730_163503_958951.jpeg', 'uploads/imagenes/general/imagen_Robot_colaborativo_DOBOT_MG400_id2_4_20260730_163503_958951.jpeg', 'jpeg', 'Foto de Equipo', '2026-07-30'),
(5, 4, 4, 'Preventivos_Fuente_de_alimentacion_2026-07-31_171355.jpeg', 'uploads/imagenes/preventivo/Preventivos_Fuente_de_alimentacion_2026-07-31_171355.jpeg', 'jpeg', 'Evidencia de Preventivos', '2026-07-31'),
(6, 4, NULL, 'imagen_Fuente_de_alimentacion_id4_1_20260731_173945_799538.jpeg', 'uploads/imagenes/general/imagen_Fuente_de_alimentacion_id4_1_20260731_173945_799538.jpeg', 'jpeg', 'Foto de Equipo', '2026-07-31');

-- --------------------------------------------------------

--
-- Table structure for table `Laboratorios`
--

CREATE TABLE `Laboratorios` (
  `Id_Laboratorio` int(11) NOT NULL,
  `Id_Sede` int(11) NOT NULL,
  `Nombre_Laboratorio` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Mantenimiento`
--

CREATE TABLE `Mantenimiento` (
  `Id_Mantenimiento` int(11) NOT NULL,
  `Id_Equipos` int(11) NOT NULL,
  `Id_TMantenimiento` int(11) NOT NULL,
  `Fecha` date NOT NULL,
  `Responsable` varchar(100) NOT NULL,
  `Costo` decimal(10,2) NOT NULL,
  `Notas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Mantenimiento`
--

INSERT INTO `Mantenimiento` (`Id_Mantenimiento`, `Id_Equipos`, `Id_TMantenimiento`, `Fecha`, `Responsable`, `Costo`, `Notas`) VALUES
(1, 2, 2, '2026-07-30', 'Jose', 0.00, NULL),
(2, 3, 2, '2026-07-31', 'juan', 100.00, ''),
(3, 4, 2, '2026-07-17', 'Joaquin', 100.00, ''),
(4, 4, 1, '2026-07-10', 'Joaquin', 150.00, '1522');

-- --------------------------------------------------------

--
-- Table structure for table `Prestamos`
--

CREATE TABLE `Prestamos` (
  `Id_Prestamos` int(11) NOT NULL,
  `Codigo_Estudiante` varchar(30) NOT NULL,
  `Fecha_Prestamo` date NOT NULL,
  `Fecha_Devolucion` date DEFAULT NULL,
  `Estado` varchar(50) NOT NULL,
  `Observaciones` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Proveedor`
--

CREATE TABLE `Proveedor` (
  `Id_Proveedor` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `NIT` varchar(30) NOT NULL,
  `Telefono` varchar(30) DEFAULT NULL,
  `Correo` varchar(100) DEFAULT NULL,
  `Direccion` varchar(200) DEFAULT NULL,
  `Origen` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Proveedor`
--

INSERT INTO `Proveedor` (`Id_Proveedor`, `Nombre`, `NIT`, `Telefono`, `Correo`, `Direccion`, `Origen`) VALUES
(1, 'TECHNO SKILLS ENGINEERING SERVICES', '900966150-7', '3502091387', 'contabilidad@tses.com.co', 'cra 20c # 72-13 OF.205', 'Bogota');

-- --------------------------------------------------------

--
-- Table structure for table `Roles`
--

CREATE TABLE `Roles` (
  `Id_Rol` int(11) NOT NULL,
  `Nombre_Rol` varchar(50) NOT NULL,
  `Permiso_Escritura` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Roles`
--

INSERT INTO `Roles` (`Id_Rol`, `Nombre_Rol`, `Permiso_Escritura`) VALUES
(1, 'Administrador', 1),
(2, 'Consulta', 0);

-- --------------------------------------------------------

--
-- Table structure for table `Sedes`
--

CREATE TABLE `Sedes` (
  `Id_Sede` int(11) NOT NULL,
  `Nombre_Sede` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Tecnologia`
--

CREATE TABLE `Tecnologia` (
  `Id_Tecnologia` int(11) NOT NULL,
  `Tipo` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Tecnologia`
--

INSERT INTO `Tecnologia` (`Id_Tecnologia`, `Tipo`) VALUES
(1, 'Electronico'),
(2, 'Electronico');

-- --------------------------------------------------------

--
-- Table structure for table `Tipo_de_adquisicion`
--

CREATE TABLE `Tipo_de_adquisicion` (
  `Id_Adquisicion` int(11) NOT NULL,
  `Tipo` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Tipo_de_adquisicion`
--

INSERT INTO `Tipo_de_adquisicion` (`Id_Adquisicion`, `Tipo`) VALUES
(1, 'Compra');

-- --------------------------------------------------------

--
-- Table structure for table `Tipo_de_alimentacion`
--

CREATE TABLE `Tipo_de_alimentacion` (
  `Id_Alimentacion` int(11) NOT NULL,
  `Tipo` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Tipo_de_alimentacion`
--

INSERT INTO `Tipo_de_alimentacion` (`Id_Alimentacion`, `Tipo`) VALUES
(1, 'Electricidad '),
(2, 'Aire');

-- --------------------------------------------------------

--
-- Table structure for table `Tipo_de_mantenimiento`
--

CREATE TABLE `Tipo_de_mantenimiento` (
  `Id_TMantenimiento` int(11) NOT NULL,
  `Tipo_Mantenimiento` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `Tipo_de_mantenimiento`
--

INSERT INTO `Tipo_de_mantenimiento` (`Id_TMantenimiento`, `Tipo_Mantenimiento`, `Descripcion`) VALUES
(1, 'Preventivos', NULL),
(2, 'Correctivos', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Usuarios`
--

CREATE TABLE `Usuarios` (
  `Id_Usuario` int(11) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Correo` varchar(150) NOT NULL,
  `Password_Hash` varchar(255) NOT NULL,
  `Id_Rol` int(11) NOT NULL,
  `Estado` varchar(20) DEFAULT 'Activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Usuarios`
--

INSERT INTO `Usuarios` (`Id_Usuario`, `Nombre`, `Correo`, `Password_Hash`, `Id_Rol`, `Estado`) VALUES
(1, 'AdministradorLab', 'admin@unisimon.edu.co', '6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6', 1, 'Activo');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Datasheets`
--
ALTER TABLE `Datasheets`
  ADD PRIMARY KEY (`Id_Datasheet`),
  ADD KEY `Id_Equipos` (`Id_Equipos`);

--
-- Indexes for table `Detalle_Prestamo`
--
ALTER TABLE `Detalle_Prestamo`
  ADD PRIMARY KEY (`Id_Detalle`),
  ADD KEY `fk_Prestamos_Detalle_Prestamo` (`Id_Prestamos`),
  ADD KEY `fk_Equipos_Detalle_Prestamo` (`Id_Equipos`);

--
-- Indexes for table `Equipos`
--
ALTER TABLE `Equipos`
  ADD PRIMARY KEY (`Id_Equipos`),
  ADD UNIQUE KEY `uq_equipo_serie` (`Serie`),
  ADD UNIQUE KEY `uq_equipo_userie` (`U_Serie`),
  ADD UNIQUE KEY `uq_equipo_labserie` (`Lab_Serie`),
  ADD KEY `fk_Proveedor_Equipos` (`Id_Proveedor`),
  ADD KEY `fk_Adquisicion_Equipos` (`Id_Adquisicion`),
  ADD KEY `fk_Tecnologia_Equipos` (`Id_Tecnologia`),
  ADD KEY `fk_Alimentacion_Equipos` (`Id_Alimentacion`),
  ADD KEY `fk_Laboratorio_Equipos` (`Id_Laboratorio`);

--
-- Indexes for table `Especificaciones_Tecnicas`
--
ALTER TABLE `Especificaciones_Tecnicas`
  ADD PRIMARY KEY (`Id_Especificacion`),
  ADD UNIQUE KEY `uq_equipo_especificacion` (`Id_Equipos`);

--
-- Indexes for table `Imagenes`
--
ALTER TABLE `Imagenes`
  ADD PRIMARY KEY (`Id_Imagen`),
  ADD KEY `fk_Equipos_Imagenes` (`Id_Equipos`),
  ADD KEY `fk_Mantenimiento_Imagenes` (`Id_Mantenimiento`);

--
-- Indexes for table `Laboratorios`
--
ALTER TABLE `Laboratorios`
  ADD PRIMARY KEY (`Id_Laboratorio`),
  ADD KEY `fk_Sede_Laboratorio` (`Id_Sede`);

--
-- Indexes for table `Mantenimiento`
--
ALTER TABLE `Mantenimiento`
  ADD PRIMARY KEY (`Id_Mantenimiento`),
  ADD KEY `fk_TMantenimiento_Mantenimiento` (`Id_TMantenimiento`),
  ADD KEY `fk_Equipos_Mantenimiento` (`Id_Equipos`);

--
-- Indexes for table `Prestamos`
--
ALTER TABLE `Prestamos`
  ADD PRIMARY KEY (`Id_Prestamos`);

--
-- Indexes for table `Proveedor`
--
ALTER TABLE `Proveedor`
  ADD PRIMARY KEY (`Id_Proveedor`);

--
-- Indexes for table `Roles`
--
ALTER TABLE `Roles`
  ADD PRIMARY KEY (`Id_Rol`);

--
-- Indexes for table `Sedes`
--
ALTER TABLE `Sedes`
  ADD PRIMARY KEY (`Id_Sede`);

--
-- Indexes for table `Tecnologia`
--
ALTER TABLE `Tecnologia`
  ADD PRIMARY KEY (`Id_Tecnologia`);

--
-- Indexes for table `Tipo_de_adquisicion`
--
ALTER TABLE `Tipo_de_adquisicion`
  ADD PRIMARY KEY (`Id_Adquisicion`);

--
-- Indexes for table `Tipo_de_alimentacion`
--
ALTER TABLE `Tipo_de_alimentacion`
  ADD PRIMARY KEY (`Id_Alimentacion`);

--
-- Indexes for table `Tipo_de_mantenimiento`
--
ALTER TABLE `Tipo_de_mantenimiento`
  ADD PRIMARY KEY (`Id_TMantenimiento`);

--
-- Indexes for table `Usuarios`
--
ALTER TABLE `Usuarios`
  ADD PRIMARY KEY (`Id_Usuario`),
  ADD UNIQUE KEY `Correo` (`Correo`),
  ADD KEY `fk_usuario_rol` (`Id_Rol`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Datasheets`
--
ALTER TABLE `Datasheets`
  MODIFY `Id_Datasheet` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Detalle_Prestamo`
--
ALTER TABLE `Detalle_Prestamo`
  MODIFY `Id_Detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Equipos`
--
ALTER TABLE `Equipos`
  MODIFY `Id_Equipos` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Especificaciones_Tecnicas`
--
ALTER TABLE `Especificaciones_Tecnicas`
  MODIFY `Id_Especificacion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `Imagenes`
--
ALTER TABLE `Imagenes`
  MODIFY `Id_Imagen` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `Laboratorios`
--
ALTER TABLE `Laboratorios`
  MODIFY `Id_Laboratorio` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Mantenimiento`
--
ALTER TABLE `Mantenimiento`
  MODIFY `Id_Mantenimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `Prestamos`
--
ALTER TABLE `Prestamos`
  MODIFY `Id_Prestamos` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Proveedor`
--
ALTER TABLE `Proveedor`
  MODIFY `Id_Proveedor` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `Roles`
--
ALTER TABLE `Roles`
  MODIFY `Id_Rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Sedes`
--
ALTER TABLE `Sedes`
  MODIFY `Id_Sede` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Tecnologia`
--
ALTER TABLE `Tecnologia`
  MODIFY `Id_Tecnologia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Tipo_de_adquisicion`
--
ALTER TABLE `Tipo_de_adquisicion`
  MODIFY `Id_Adquisicion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `Tipo_de_alimentacion`
--
ALTER TABLE `Tipo_de_alimentacion`
  MODIFY `Id_Alimentacion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Tipo_de_mantenimiento`
--
ALTER TABLE `Tipo_de_mantenimiento`
  MODIFY `Id_TMantenimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `Usuarios`
--
ALTER TABLE `Usuarios`
  MODIFY `Id_Usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Datasheets`
--
ALTER TABLE `Datasheets`
  ADD CONSTRAINT `Datasheets_ibfk_1` FOREIGN KEY (`Id_Equipos`) REFERENCES `Equipos` (`Id_Equipos`) ON DELETE CASCADE;

--
-- Constraints for table `Detalle_Prestamo`
--
ALTER TABLE `Detalle_Prestamo`
  ADD CONSTRAINT `fk_Equipos_Detalle_Prestamo` FOREIGN KEY (`Id_Equipos`) REFERENCES `Equipos` (`Id_Equipos`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_Prestamos_Detalle_Prestamo` FOREIGN KEY (`Id_Prestamos`) REFERENCES `Prestamos` (`Id_Prestamos`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `Equipos`
--
ALTER TABLE `Equipos`
  ADD CONSTRAINT `fk_Adquisicion_Equipos` FOREIGN KEY (`Id_Adquisicion`) REFERENCES `Tipo_de_adquisicion` (`Id_Adquisicion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_Alimentacion_Equipos` FOREIGN KEY (`Id_Alimentacion`) REFERENCES `Tipo_de_alimentacion` (`Id_Alimentacion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_Laboratorio_Equipos` FOREIGN KEY (`Id_Laboratorio`) REFERENCES `Laboratorios` (`Id_Laboratorio`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_Proveedor_Equipos` FOREIGN KEY (`Id_Proveedor`) REFERENCES `Proveedor` (`Id_Proveedor`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_Tecnologia_Equipos` FOREIGN KEY (`Id_Tecnologia`) REFERENCES `Tecnologia` (`Id_Tecnologia`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `Especificaciones_Tecnicas`
--
ALTER TABLE `Especificaciones_Tecnicas`
  ADD CONSTRAINT `fk_Equipos_Especificaciones` FOREIGN KEY (`Id_Equipos`) REFERENCES `Equipos` (`Id_Equipos`) ON DELETE CASCADE;

--
-- Constraints for table `Imagenes`
--
ALTER TABLE `Imagenes`
  ADD CONSTRAINT `fk_Equipos_Imagenes` FOREIGN KEY (`Id_Equipos`) REFERENCES `Equipos` (`Id_Equipos`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_Mantenimiento_Imagenes` FOREIGN KEY (`Id_Mantenimiento`) REFERENCES `Mantenimiento` (`Id_Mantenimiento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `Laboratorios`
--
ALTER TABLE `Laboratorios`
  ADD CONSTRAINT `fk_Sede_Laboratorio` FOREIGN KEY (`Id_Sede`) REFERENCES `Sedes` (`Id_Sede`) ON DELETE CASCADE;

--
-- Constraints for table `Mantenimiento`
--
ALTER TABLE `Mantenimiento`
  ADD CONSTRAINT `fk_Equipos_Mantenimiento` FOREIGN KEY (`Id_Equipos`) REFERENCES `Equipos` (`Id_Equipos`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_TMantenimiento_Mantenimiento` FOREIGN KEY (`Id_TMantenimiento`) REFERENCES `Tipo_de_mantenimiento` (`Id_TMantenimiento`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `Usuarios`
--
ALTER TABLE `Usuarios`
  ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`Id_Rol`) REFERENCES `Roles` (`Id_Rol`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
