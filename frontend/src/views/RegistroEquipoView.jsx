import React, { useMemo, useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Cpu,
  Layers,
  Copy,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import EquipoSearchSelect from '../components/EquipoSearchSelect';

const INITIAL_FORM = {
  nombre_equipo: '',
  marca: '',
  modelo: '',
  serie_universidad: '',
  serie_equipo: '',
  serie_laboratorio: '',
  estado: 'Disponible',
  fecha_ingreso: new Date().toISOString().slice(0, 10),
  valor_adquisicion: '',
  responsable_equipo: '',
  observaciones: '',
  id_sede: '',
  id_laboratorio: '',
  id_tipo_adquisicion: '',
  id_proveedor: '',
  id_fuente: '',
  id_tecnologia: '',
};

const INITIAL_ESP = {
  rango_voltaje: '',
  corriente: '',
  frecuencia: '',
  potencia: '',
  dimensiones_mm: '',
  peso: '',
  senal_salida: '',
};

export default function RegistroEquipoView({
  equipos = [],
  catalogos,
  esquemaListo,
  onOpenCatalogos,
  onRefresh,
  onNavigate,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [esp, setEsp] = useState(INITIAL_ESP);
  const [componentes, setComponentes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [imagenes, setImagenes] = useState([]);
  const [equipoImportadoId, setEquipoImportadoId] = useState('');
  const [importarModalOpen, setImportarModalOpen] = useState(false);
  const [mensajeImportacion, setMensajeImportacion] = useState('');
  const [descImgActual, setDescImgActual] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [exito, setExito] = useState('');

  const updateForm = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));
  const updateEsp = (field, val) => setEsp((prev) => ({ ...prev, [field]: val }));

  const agregarComponente = () => {
    setComponentes((prev) => [
      ...prev,
      { nombre_componente: '', marca: '', modelo: '', serie_referencia: '' },
    ]);
  };

  const actualizarComponente = (idx, field, val) => {
    setComponentes((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const eliminarComponente = (idx) => {
    setComponentes((prev) => prev.filter((_, i) => i !== idx));
  };

  const laboratoriosDeSede = useMemo(() => {
    const todos = catalogos.laboratorios || [];
    if (!form.id_sede) return [];
    return todos.filter((l) => String(l.id_sede) === String(form.id_sede));
  }, [catalogos.laboratorios, form.id_sede]);

  const handleChangeSede = (nuevaSedeId) => {
    setForm((prev) => ({
      ...prev,
      id_sede: nuevaSedeId,
      id_laboratorio: '',
    }));
  };

  // Importar todas las propiedades de otro equipo EXCEPTO los 3 seriales únicos
  const handleImportarPropiedades = (idSeleccionado, eqOrigen) => {
    setEquipoImportadoId(idSeleccionado);
    const eq =
      eqOrigen || equipos.find((x) => String(x.id_equipo) === String(idSeleccionado));
    if (!eq) return;

    const sedeDeLab =
      eq.id_sede ||
      (catalogos.laboratorios || []).find(
        (l) => Number(l.id_laboratorio) === Number(eq.id_laboratorio)
      )?.id_sede ||
      '';

    setForm({
      nombre_equipo: eq.nombre_equipo || '',
      marca: eq.marca || eq.fabricante || '',
      modelo: eq.modelo || '',
      serie_universidad: '',
      serie_equipo: '',
      serie_laboratorio: '',
      estado: eq.estado || 'Disponible',
      fecha_ingreso: eq.fecha_ingreso || new Date().toISOString().slice(0, 10),
      valor_adquisicion: eq.valor_adquisicion != null ? String(eq.valor_adquisicion) : '',
      responsable_equipo: eq.responsable_equipo || '',
      observaciones: eq.observaciones || '',
      id_sede: sedeDeLab ? String(sedeDeLab) : '',
      id_laboratorio: eq.id_laboratorio ? String(eq.id_laboratorio) : '',
      id_tipo_adquisicion: eq.id_tipo_adquisicion ? String(eq.id_tipo_adquisicion) : '',
      id_proveedor: eq.id_proveedor ? String(eq.id_proveedor) : '',
      id_fuente: eq.id_fuente ? String(eq.id_fuente) : '',
      id_tecnologia: eq.id_tecnologia ? String(eq.id_tecnologia) : '',
    });

    const e = eq.especificaciones || {};
    setEsp({
      rango_voltaje: e.rango_voltaje || '',
      corriente: e.corriente || '',
      frecuencia: e.frecuencia || '',
      potencia: e.potencia || '',
      dimensiones_mm: e.dimensiones_mm || '',
      peso: e.peso || '',
      senal_salida: e.senal_salida || '',
    });

    setComponentes(
      (eq.componentes || []).map((c) => ({
        nombre_componente: c.nombre_componente || '',
        marca: c.marca || '',
        modelo: c.modelo || '',
        serie_referencia: '',
      }))
    );

    setDocumentos(
      (eq.documentos || []).map((d) => ({
        nombre_archivo:
          d.nombre_archivo || (d.ruta_archivo_pdf || '').split('/').pop() || 'Datasheet.pdf',
        ruta_archivo_pdf: d.ruta_archivo_pdf,
        tipo: d.tipo || 'pdf',
      }))
    );

    setImagenes(
      (eq.imagenes || []).map((img) => ({
        nombre_imagen: img.nombre_imagen || (img.ruta_imagen || '').split('/').pop() || 'Foto.webp',
        descripcion_imagen: img.descripcion_imagen || 'Foto de Equipo',
        ruta_imagen: img.ruta_imagen,
        tipo: img.tipo || 'webp',
      }))
    );

    setMensajeImportacion(
      `Se importaron las propiedades de "${eq.nombre_equipo}". Ingresa únicamente los 3 números de serie de esta nueva unidad.`
    );
    setImportarModalOpen(false);
    setTimeout(() => setMensajeImportacion(''), 5000);
  };

  const handleUploadDatasheet = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoArchivo(true);
    try {
      const nuevosDocs = [];
      for (const file of files) {
        const res = await api.subirArchivo('datasheets', file, {
          tipo_documento: 'Datasheet',
          nombre_equipo: form.nombre_equipo || 'Equipo',
        });
        nuevosDocs.push({
          nombre_archivo: res.nombre_archivo || file.name,
          ruta_archivo_pdf: res.ruta,
          tipo: res.tipo || 'pdf',
        });
      }
      setDocumentos((prev) => [...prev, ...nuevosDocs]);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendoArchivo(false);
      e.target.value = '';
    }
  };

  const handleUploadImagen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoArchivo(true);
    try {
      const nuevasImgs = [];
      for (const file of files) {
        const res = await api.subirArchivo('imagenes', file, {
          tipo_documento: descImgActual || 'Foto_de_Equipo',
          nombre_equipo: form.nombre_equipo || 'Equipo',
        });
        nuevasImgs.push({
          nombre_imagen: res.nombre_archivo || file.name,
          descripcion_imagen: descImgActual || 'Foto de Equipo',
          ruta_imagen: res.ruta,
          tipo: res.tipo || 'webp',
        });
      }
      setImagenes((prev) => [...prev, ...nuevasImgs]);
      setDescImgActual('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendoArchivo(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre_equipo.trim()) return;

    setGuardando(true);
    try {
      const toIntOrNull = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : null);
      const payload = {
        nombre_equipo: form.nombre_equipo.trim(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        serie_equipo: form.serie_equipo.trim() || 'N/A',
        serie_universidad: form.serie_universidad.trim() || 'N/A',
        serie_laboratorio: form.serie_laboratorio.trim(),
        estado: form.estado || 'Disponible',
        fecha_ingreso: form.fecha_ingreso || null,
        valor_adquisicion:
          form.valor_adquisicion !== '' && form.valor_adquisicion !== null
            ? String(form.valor_adquisicion).trim()
            : null,
        responsable_equipo: form.responsable_equipo.trim() || null,
        observaciones: form.observaciones.trim() || null,
        id_laboratorio: toIntOrNull(form.id_laboratorio),
        id_tipo_adquisicion: toIntOrNull(form.id_tipo_adquisicion),
        id_proveedor: toIntOrNull(form.id_proveedor),
        id_fuente: toIntOrNull(form.id_fuente),
        id_tecnologia: toIntOrNull(form.id_tecnologia),
        especificaciones: { ...esp },
        componentes: componentes.filter((c) => c.nombre_componente && c.nombre_componente.trim()),
        documentos,
        imagenes,
      };

      await api.registrarEquipo(payload, esquemaListo);
      await onRefresh();
      setForm(INITIAL_FORM);
      setEsp(INITIAL_ESP);
      setComponentes([]);
      setDocumentos([]);
      setImagenes([]);
      setEquipoImportadoId('');
      setExito('Equipo de Mecatrónica registrado exitosamente.');
      setTimeout(() => {
        setExito('');
        onNavigate('Inventario');
      }, 1100);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-white border border-emerald-200/90 rounded-xl focus:outline-none focus:border-[#1B5E43] text-[#14281D] placeholder:text-[#8BA395]';
  const labelClass = 'block text-xs font-semibold text-[#2E4839] mb-1.5';
  const addBtnClass =
    'px-3 py-2.5 rounded-xl bg-[#EEF6F1] border border-emerald-200 text-[#1B5E43] hover:bg-[#1B5E43] hover:text-white transition-colors shrink-0 flex items-center justify-center';

  return (
    <form onSubmit={handleSubmit} className="space-y-7 pb-10">
      {/* Header + Importar propiedades de otro equipo */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-[#5E7A6B] mb-1.5">
            GESTIÓN DE LABORATORIO &nbsp;/&nbsp; ALTA TÉCNICA MECATRÓNICA
          </p>
          <h1 className="text-3xl font-extrabold text-[#14281D] tracking-tight">
            Registro de equipo
          </h1>
          <p className="text-sm text-[#526B5C] mt-1">
            Diligencia la hoja de vida con datos generales, especificaciones técnicas, componentes, datasheets e imágenes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setImportarModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-white border border-emerald-200 text-[#1B5E43] text-xs sm:text-sm font-semibold hover:bg-[#E7F5ED] transition-colors shadow-xs flex items-center gap-2 self-start lg:self-auto"
        >
          <Copy size={16} />
          Importar propiedades de otro equipo
        </button>
      </div>

      {/* Modal emergente al presionar "Importar propiedades de otro equipo" */}
      {importarModalOpen && (
        <div
          onClick={() => setImportarModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D261A]/40 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-emerald-100 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-emerald-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF6F1] text-[#1B5E43] flex items-center justify-center shrink-0">
                  <Copy size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#14281D]">
                    Importar propiedades de otro equipo
                  </h3>
                  <p className="text-xs text-[#6B8576]">
                    Copia toda la ficha técnica excepto los 3 números de serie (universidad, fábrica y laboratorio).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportarModalOpen(false)}
                className="p-1.5 rounded-xl text-[#526B5C] hover:bg-emerald-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 pb-16">
              <label className="block text-xs font-semibold text-[#2E4839]">
                Buscar equipo plantilla por nombre, serie de universidad o serie de laboratorio
              </label>
              <EquipoSearchSelect
                equipos={equipos}
                multiple={false}
                value={equipoImportadoId}
                onChange={handleImportarPropiedades}
                placeholder="Escribe nombre o serie para filtrar y elegir..."
              />
            </div>
          </div>
        </div>
      )}

      {mensajeImportacion && (
        <div className="p-4 rounded-2xl bg-[#E7F5ED] border border-emerald-300 text-[#145338] text-xs font-semibold flex items-center gap-2">
          <Copy size={16} />
          {mensajeImportacion}
        </div>
      )}

      {exito && (
        <div className="p-4 rounded-2xl bg-[#E7F5ED] border border-emerald-300 text-[#145338] text-sm font-semibold flex items-center gap-2">
          <Check size={18} />
          {exito}
        </div>
      )}

      {/* SECCIÓN 1: Datos Generales, Series y Ubicación */}
      <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-5 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
        <div className="border-b border-emerald-100 pb-3.5">
          <h2 className="text-base font-bold text-[#14281D]">
            1. Datos del Equipo, Ubicación y Series
          </h2>
          <p className="text-xs text-[#6B8576]">
            Nombre, marca, modelo, series únicas de Universidad, Laboratorio y Fábrica, y ubicación
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Nombre_Equipo */}
          <div>
            <label className={labelClass}>Nombre del Equipo *</label>
            <input
              type="text"
              required
              value={form.nombre_equipo}
              onChange={(e) => updateForm('nombre_equipo', e.target.value)}
              placeholder="Ej: Robot colaborativo DOBOT MG400"
              className={inputClass}
            />
          </div>

          {/* Marca */}
          <div>
            <label className={labelClass}>Marca *</label>
            <input
              type="text"
              required
              value={form.marca}
              onChange={(e) => updateForm('marca', e.target.value)}
              placeholder="Ej: DOBOT, Gwinstek, Siemens"
              className={inputClass}
            />
          </div>

          {/* Modelo */}
          <div>
            <label className={labelClass}>Modelo *</label>
            <input
              type="text"
              required
              value={form.modelo}
              onChange={(e) => updateForm('modelo', e.target.value)}
              placeholder="Ej: MG400, GPE-3232"
              className={inputClass}
            />
          </div>

          {/* U_Serie (Opcional: si no se registra se guarda como N/A) */}
          <div>
            <label className={labelClass}>Serie Universidad</label>
            <input
              type="text"
              value={form.serie_universidad}
              onChange={(e) => updateForm('serie_universidad', e.target.value)}
              placeholder="Ej: 100022 (Si se deja vacío será N/A)"
              className={inputClass}
            />
          </div>

          {/* Lab_Serie (Obligatorio y único) */}
          <div>
            <label className={labelClass}>Serie Laboratorio *</label>
            <input
              type="text"
              required
              value={form.serie_laboratorio}
              onChange={(e) => updateForm('serie_laboratorio', e.target.value)}
              placeholder="Ej: MEC000001 / MEC000002"
              className={inputClass}
            />
          </div>

          {/* Serie (Opcional y se puede repetir) */}
          <div>
            <label className={labelClass}>Serie de Fábrica</label>
            <input
              type="text"
              value={form.serie_equipo}
              onChange={(e) => updateForm('serie_equipo', e.target.value)}
              placeholder="Ej: 6970632060045 (Se puede repetir)"
              className={inputClass}
            />
          </div>

          {/* Sede con botón + */}
          <div>
            <label className={labelClass}>Sede</label>
            <div className="flex gap-1.5">
              <select
                value={form.id_sede}
                onChange={(e) => handleChangeSede(e.target.value)}
                className={inputClass}
              >
                <option value="">-- Seleccionar sede --</option>
                {(catalogos.sedes || []).map((s) => (
                  <option key={s.id_sede} value={s.id_sede}>
                    {s.nombre_sede}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Agregar nueva Sede"
                onClick={() =>
                  onOpenCatalogos({
                    tab: 'ubicacion',
                    focus: 'sede',
                    title: 'Agregar nueva Sede',
                    onCreated: (newSedeId) => handleChangeSede(String(newSedeId)),
                  })
                }
                className={addBtnClass}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Laboratorio dependiente de la Sede seleccionada + botón + */}
          <div>
            <label className={labelClass}>Laboratorio Asignado</label>
            <div className="flex gap-1.5">
              <select
                value={form.id_laboratorio}
                onChange={(e) => updateForm('id_laboratorio', e.target.value)}
                disabled={!form.id_sede && (catalogos.laboratorios || []).length === 0}
                className={inputClass}
              >
                <option value="">
                  {form.id_sede
                    ? '-- Seleccionar laboratorio --'
                    : '-- Sin laboratorio / Selecciona sede --'}
                </option>
                {(form.id_sede ? laboratoriosDeSede : catalogos.laboratorios || []).map((l) => (
                  <option key={l.id_laboratorio} value={l.id_laboratorio}>
                    {l.nombre_laboratorio}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Agregar nuevo Laboratorio"
                onClick={() =>
                  onOpenCatalogos({
                    tab: 'ubicacion',
                    focus: 'laboratorio',
                    id_sede: form.id_sede,
                    title: 'Agregar nuevo Laboratorio',
                    onCreated: (newLabId, sedeAsociada) => {
                      if (sedeAsociada) updateForm('id_sede', String(sedeAsociada));
                      updateForm('id_laboratorio', String(newLabId));
                    },
                  })
                }
                className={addBtnClass}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className={labelClass}>Estado del Equipo *</label>
            <select
              value={form.estado}
              onChange={(e) => updateForm('estado', e.target.value)}
              className={inputClass}
            >
              <option value="Disponible">Disponible</option>
              <option value="En Mantenimiento">En Mantenimiento</option>
              <option value="En Préstamo">En Préstamo</option>
              <option value="Fuera de Servicio">Fuera de Servicio</option>
            </select>
          </div>

          {/* Fecha_Ingreso */}
          <div>
            <label className={labelClass}>Fecha de Ingreso *</label>
            <input
              type="date"
              required
              value={form.fecha_ingreso}
              onChange={(e) => updateForm('fecha_ingreso', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Proveedor Comercial con botón + */}
          <div>
            <label className={labelClass}>Proveedor Comercial *</label>
            <div className="flex gap-1.5">
              <select
                value={form.id_proveedor}
                onChange={(e) => updateForm('id_proveedor', e.target.value)}
                className={inputClass}
              >
                <option value="">-- Seleccionar proveedor --</option>
                {(catalogos.proveedores || []).map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.nombre_proveedor}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Agregar Proveedor Comercial"
                onClick={() =>
                  onOpenCatalogos({
                    tab: 'proveedores',
                    focus: 'proveedor',
                    title: 'Agregar Proveedor Comercial',
                    onCreated: (id) => updateForm('id_proveedor', String(id)),
                  })
                }
                className={addBtnClass}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Tipo de Adquisición con botón + */}
          <div>
            <label className={labelClass}>Tipo de Adquisición *</label>
            <div className="flex gap-1.5">
              <select
                value={form.id_tipo_adquisicion}
                onChange={(e) => updateForm('id_tipo_adquisicion', e.target.value)}
                className={inputClass}
              >
                <option value="">-- Seleccionar adquisición --</option>
                {(catalogos.tipos_adquisicion || []).map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.descripcion}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="Agregar Tipo de Adquisición"
                onClick={() =>
                  onOpenCatalogos({
                    tab: 'parametricas',
                    focus: 'catalogo',
                    catKey: 'tipos_adquisicion',
                    title: 'Agregar Tipo de Adquisición',
                    onCreated: (id) => updateForm('id_tipo_adquisicion', String(id)),
                  })
                }
                className={addBtnClass}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Valor_Adquisicion */}
          <div>
            <label className={labelClass}>Valor de Adquisición</label>
            <input
              type="text"
              value={form.valor_adquisicion}
              onChange={(e) => updateForm('valor_adquisicion', e.target.value)}
              placeholder="Ej: 1500000"
              className={inputClass}
            />
          </div>

          {/* Responsable_Equipo */}
          <div>
            <label className={labelClass}>Responsable del Equipo</label>
            <input
              type="text"
              value={form.responsable_equipo}
              onChange={(e) => updateForm('responsable_equipo', e.target.value)}
              placeholder="Ej: Juan / Docente encargado"
              className={inputClass}
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className={labelClass}>Observaciones Generales</label>
            <input
              type="text"
              value={form.observaciones}
              onChange={(e) => updateForm('observaciones', e.target.value)}
              placeholder="Notas u observaciones relevantes del equipo..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Especificaciones Técnicas */}
      <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-5 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
        <div className="border-b border-emerald-100 pb-3.5 flex items-center gap-2.5">
          <Cpu size={18} className="text-[#1B5E43]" />
          <div>
            <h2 className="text-base font-bold text-[#14281D]">
              2. Especificaciones Técnicas
            </h2>
            <p className="text-xs text-[#6B8576]">
              Tipo de alimentación, tecnología predominante, rango de voltaje, corriente, frecuencia, potencia, dimensiones, peso y señal de salida
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FAFDFB] border border-emerald-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tipo de Alimentación con botón + */}
            <div>
              <label className={labelClass}>Tipo de Alimentación *</label>
              <div className="flex gap-1.5">
                <select
                  value={form.id_fuente}
                  onChange={(e) => updateForm('id_fuente', e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Seleccionar alimentación --</option>
                  {(catalogos.fuentes_alimentacion || []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.descripcion}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Agregar Tipo de Alimentación"
                  onClick={() =>
                    onOpenCatalogos({
                      tab: 'parametricas',
                      focus: 'catalogo',
                      catKey: 'fuentes_alimentacion',
                      title: 'Agregar Tipo de Alimentación',
                      onCreated: (id) => updateForm('id_fuente', String(id)),
                    })
                  }
                  className={addBtnClass}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Tecnología con botón + */}
            <div>
              <label className={labelClass}>Tecnología *</label>
              <div className="flex gap-1.5">
                <select
                  value={form.id_tecnologia}
                  onChange={(e) => updateForm('id_tecnologia', e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- Seleccionar tecnología --</option>
                  {(catalogos.tecnologias || []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.descripcion}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Agregar Tecnología"
                  onClick={() =>
                    onOpenCatalogos({
                      tab: 'parametricas',
                      focus: 'catalogo',
                      catKey: 'tecnologias',
                      title: 'Agregar Tecnología',
                      onCreated: (id) => updateForm('id_tecnologia', String(id)),
                    })
                  }
                  className={addBtnClass}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {[
              ['rango_voltaje', 'Rango de Voltaje', 'Ej: 110 V / 220 V'],
              ['corriente', 'Corriente', 'Ej: 5A'],
              ['frecuencia', 'Frecuencia', 'Ej: 50/60 Hz'],
              ['potencia', 'Potencia', 'Ej: 10000W / 150W'],
              ['dimensiones_mm', 'Dimensiones en mm', 'Ej: 300X200X100'],
              ['peso', 'Peso', 'Ej: 50g / 12.5 kg'],
              ['senal_salida', 'Señal de Salida', 'Ej: 0-30V DC / Digital / PWM'],
            ].map(([key, lbl, ph]) => (
              <div key={key}>
                <label className={labelClass}>{lbl}</label>
                <input
                  type="text"
                  value={esp[key]}
                  onChange={(e) => updateEsp(key, e.target.value)}
                  placeholder={ph}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Componentes y Accesorios (Igual al formato de Biomédica) */}
      <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-4 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-[#1B5E43]" />
            <div>
              <h2 className="text-base font-bold text-[#14281D]">
                3. Componentes y Accesorios
              </h2>
              <p className="text-xs text-[#6B8576]">
                Sondas, sensores, fuentes externas o accesorios incluidos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={agregarComponente}
            className="px-3.5 py-2 rounded-xl bg-[#EEF6F1] text-[#1B5E43] text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
          >
            <Plus size={14} /> Añadir componente
          </button>
        </div>

        {componentes.length === 0 ? (
          <p className="text-xs text-[#6B8576] bg-[#FAFDFB] p-4 rounded-xl border border-emerald-100/70">
            Sin componentes registrados. Haz clic en &ldquo;Añadir componente&rdquo; si el equipo cuenta con partes inventariables.
          </p>
        ) : (
          <div className="space-y-2.5">
            {componentes.map((comp, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl bg-[#FAFDFB] border border-emerald-100 items-center"
              >
                <input
                  type="text"
                  placeholder="Nombre del componente *"
                  value={comp.nombre_componente}
                  onChange={(e) => actualizarComponente(idx, 'nombre_componente', e.target.value)}
                  className={`${inputClass} sm:col-span-4`}
                />
                <input
                  type="text"
                  placeholder="Marca"
                  value={comp.marca}
                  onChange={(e) => actualizarComponente(idx, 'marca', e.target.value)}
                  className={`${inputClass} sm:col-span-3`}
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={comp.modelo}
                  onChange={(e) => actualizarComponente(idx, 'modelo', e.target.value)}
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  type="text"
                  placeholder="Serie / Ref"
                  value={comp.serie_referencia}
                  onChange={(e) => actualizarComponente(idx, 'serie_referencia', e.target.value)}
                  className={`${inputClass} sm:col-span-2`}
                />
                <button
                  type="button"
                  onClick={() => eliminarComponente(idx)}
                  className="p-2 rounded-xl text-[#526B5C] hover:bg-emerald-100 sm:col-span-1 flex justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 4: Datasheets e Imágenes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datasheets */}
        <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-4 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <FileText size={18} className="text-[#1B5E43]" />
              <div>
                <h2 className="text-base font-bold text-[#14281D]">
                  4. Datasheets y Manuales
                </h2>
                <p className="text-xs text-[#6B8576]">
                  Sube uno o varios archivos PDF asociados al equipo
                </p>
              </div>
            </div>

            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#1B5E43] text-white text-xs font-semibold hover:bg-[#144732] flex items-center justify-center gap-2 shrink-0">
              <Upload size={15} />
              {subiendoArchivo ? 'Subiendo...' : 'Subir PDF'}
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleUploadDatasheet}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2">
            {documentos.map((d, i) => (
              <div
                key={i}
                className="px-3.5 py-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100 flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E7F5ED] text-[#145338] font-bold shrink-0">
                    PDF
                  </span>
                  <span className="font-semibold text-[#14281D] truncate">
                    {d.nombre_archivo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDocumentos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-emerald-800 hover:underline shrink-0 font-semibold"
                >
                  Quitar
                </button>
              </div>
            ))}
            {documentos.length === 0 && (
              <p className="text-xs text-[#6B8576]">
                Aún no se han adjuntado datasheets PDF para este equipo.
              </p>
            )}
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white rounded-2xl border border-emerald-100/90 p-6 space-y-4 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
          <div className="flex items-center gap-2.5">
            <ImageIcon size={18} className="text-[#1B5E43]" />
            <div>
              <h2 className="text-base font-bold text-[#14281D]">
                4. Fotografías del Equipo
              </h2>
              <p className="text-xs text-[#6B8576]">
                Registro visual general del equipo
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={descImgActual}
              onChange={(e) => setDescImgActual(e.target.value)}
              placeholder="Descripción (Ej: Foto de Equipo / Vista frontal)"
              className={`${inputClass} flex-1`}
            />
            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#1B5E43] text-white text-xs font-semibold hover:bg-[#144732] flex items-center justify-center gap-2 shrink-0">
              <Upload size={15} />
              {subiendoArchivo ? 'Subiendo...' : 'Subir Imágenes'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadImagen}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {imagenes.map((img, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden border border-emerald-200 aspect-video bg-[#FAFDFB]"
              >
                <img
                  src={img.ruta_imagen}
                  alt={img.descripcion_imagen}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagenes((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 bg-white/90 text-[#14281D] rounded-lg p-1 text-[10px] font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onNavigate('Inventario')}
          className="px-5 py-2.5 rounded-xl bg-white border border-emerald-200 text-[#14281D] text-sm font-semibold hover:bg-emerald-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="px-6 py-2.5 rounded-xl bg-[#1B5E43] text-white text-sm font-semibold hover:bg-[#144732] flex items-center gap-2 shadow-sm"
        >
          <Check size={17} />
          {guardando ? 'Guardando...' : 'Finalizar y Registrar Equipo'}
        </button>
      </div>
    </form>
  );
}
