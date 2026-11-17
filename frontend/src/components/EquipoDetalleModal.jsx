import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Cpu,
  ExternalLink,
  Upload,
  CheckCircle2,
  Pencil,
  Plus,
  Check,
  Trash2,
  Layers,
  Wrench,
} from 'lucide-react';
import { api } from '../services/api';

export default function EquipoDetalleModal({
  equipo,
  mantenimientos = [],
  onClose,
  catalogos = {},
  esquemaListo,
  onRefresh,
  readOnly = false,
}) {
  const [editando, setEditando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [form, setForm] = useState({});
  const [espForm, setEspForm] = useState({});
  const [componentesForm, setComponentesForm] = useState([]);

  const [fotoActivaIdx, setFotoActivaIdx] = useState(0);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [descImg, setDescImg] = useState('');
  const [subiendoImg, setSubiendoImg] = useState(false);

  useEffect(() => {
    setFotoActivaIdx(0);
    if (!equipo) return;
    const sedeDeLab =
      equipo.id_sede ||
      (catalogos.laboratorios || []).find(
        (l) => Number(l.id_laboratorio) === Number(equipo.id_laboratorio)
      )?.id_sede ||
      '';

    setForm({
      nombre_equipo: equipo.nombre_equipo || '',
      marca: equipo.marca || equipo.fabricante || '',
      modelo: equipo.modelo || '',
      serie_universidad: equipo.serie_universidad || '',
      serie_equipo: equipo.serie_equipo || '',
      serie_laboratorio: equipo.serie_laboratorio || '',
      estado: equipo.estado || 'Disponible',
      fecha_ingreso: equipo.fecha_ingreso || equipo.fecha_adquisicion || '',
      valor_adquisicion:
        equipo.valor_adquisicion != null ? String(equipo.valor_adquisicion) : '',
      responsable_equipo: equipo.responsable_equipo || '',
      observaciones: equipo.observaciones || '',
      id_sede: sedeDeLab ? String(sedeDeLab) : '',
      id_laboratorio: equipo.id_laboratorio ? String(equipo.id_laboratorio) : '',
      id_tipo_adquisicion: equipo.id_tipo_adquisicion
        ? String(equipo.id_tipo_adquisicion)
        : '',
      id_proveedor: equipo.id_proveedor ? String(equipo.id_proveedor) : '',
      id_fuente: equipo.id_fuente ? String(equipo.id_fuente) : '',
      id_tecnologia: equipo.id_tecnologia ? String(equipo.id_tecnologia) : '',
    });

    const e = equipo.especificaciones || {};
    setEspForm({
      rango_voltaje: e.rango_voltaje || '',
      corriente: e.corriente || '',
      frecuencia: e.frecuencia || '',
      potencia: e.potencia || '',
      dimensiones_mm: e.dimensiones_mm || '',
      peso: e.peso || '',
      senal_salida: e.senal_salida || '',
    });

    setComponentesForm(
      (equipo.componentes || []).map((c) => ({
        nombre_componente: c.nombre_componente || '',
        marca: c.marca || '',
        modelo: c.modelo || '',
        serie_referencia: c.serie_referencia || '',
      }))
    );
  }, [equipo, catalogos.laboratorios]);

  const laboratoriosDeSede = useMemo(() => {
    const todos = catalogos.laboratorios || [];
    if (!form.id_sede) return todos;
    return todos.filter((l) => String(l.id_sede) === String(form.id_sede));
  }, [catalogos.laboratorios, form.id_sede]);

  if (!equipo) return null;
  const esp = equipo.especificaciones || {};
  const imagenes = equipo.imagenes || [];
  const documentos = equipo.documentos || [];
  const fotoPrincipal = imagenes[fotoActivaIdx] || imagenes[0] || null;

  const mantenimientosEquipo = (mantenimientos || []).filter(
    (m) => Number(m.id_equipo) === Number(equipo.id_equipo)
  );

  const camposGenerales = [
    ['Serie Universidad (U_Serie)', equipo.serie_universidad],
    ['Serie Laboratorio (Lab_Serie)', equipo.serie_laboratorio],
    ['Serie Fábrica (Serie)', equipo.serie_equipo],
    ['Marca', equipo.marca || equipo.fabricante],
    ['Modelo', equipo.modelo],
    ['Estado', equipo.en_prestamo ? 'En Préstamo' : equipo.estado || 'Disponible'],
    ['Sede', equipo.nombre_sede],
    ['Laboratorio', equipo.nombre_laboratorio],
    ['Fecha de Ingreso', equipo.fecha_ingreso || equipo.fecha_adquisicion],
    ...(!readOnly
      ? [
          ['Tipo de Adquisición', equipo.adquisicion_descripcion],
          [
            'Valor de Adquisición',
            equipo.valor_adquisicion != null && String(equipo.valor_adquisicion).trim() !== ''
              ? !Number.isNaN(Number(equipo.valor_adquisicion))
                ? `$${Number(equipo.valor_adquisicion).toLocaleString('es-CO')}`
                : equipo.valor_adquisicion
              : null,
          ],
          ['Responsable', equipo.responsable_equipo],
          ['Proveedor', equipo.nombre_proveedor],
        ]
      : []),
  ];

  const updateForm = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));
  const updateEsp = (field, val) => setEspForm((prev) => ({ ...prev, [field]: val }));

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!form.nombre_equipo?.trim()) {
      alert('El nombre del equipo es obligatorio.');
      return;
    }
    setGuardandoEdicion(true);
    try {
      const toIntOrNull = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : null);
      const payload = {
        nombre_equipo: form.nombre_equipo.trim(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        serie_universidad: form.serie_universidad.trim(),
        serie_equipo: form.serie_equipo.trim(),
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
        especificaciones: { ...espForm },
        componentes: componentesForm.filter(
          (c) => c.nombre_componente && c.nombre_componente.trim()
        ),
      };

      await api.actualizarEquipo(equipo.id_equipo, payload, esquemaListo);
      await onRefresh();
      setEditando(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleSubirDatasheet = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoDoc(true);
    try {
      for (const file of files) {
        const res = await api.subirArchivo('datasheets', file, {
          tipo_documento: 'Datasheet',
          nombre_equipo: equipo.nombre_equipo || 'Equipo',
        });
        await api.agregarDocumentoEquipo(
          equipo.id_equipo,
          {
            nombre_archivo: res.nombre_archivo || file.name,
            ruta_archivo_pdf: res.ruta,
            tipo: res.tipo || 'pdf',
          },
          esquemaListo
        );
      }
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendoDoc(false);
      e.target.value = '';
    }
  };

  const handleEliminarDocumento = async (idDoc) => {
    if (!window.confirm('¿Eliminar este Datasheet PDF del equipo?')) return;
    await api.eliminarDocumentoEquipo(idDoc, esquemaListo);
    await onRefresh();
  };

  const handleSubirImagen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSubiendoImg(true);
    try {
      for (const file of files) {
        const res = await api.subirArchivo('imagenes', file, {
          tipo_documento: descImg || 'Foto_de_Equipo',
          nombre_equipo: equipo.nombre_equipo || 'Equipo',
        });
        await api.agregarImagenEquipo(
          equipo.id_equipo,
          {
            nombre_imagen: res.nombre_archivo || file.name,
            descripcion_imagen: descImg || 'Foto de Equipo',
            ruta_imagen: res.ruta,
            tipo: res.tipo || 'webp',
          },
          esquemaListo
        );
      }
      setDescImg('');
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendoImg(false);
      e.target.value = '';
    }
  };

  const handleEliminarImagen = async (idImg) => {
    if (!window.confirm('¿Eliminar esta fotografía del equipo?')) return;
    await api.eliminarImagenEquipo(idImg, esquemaListo);
    setFotoActivaIdx(0);
    await onRefresh();
  };

  const inputClass =
    'w-full px-3 py-2 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-[#1B5E43] text-[#14281D]';
  const labelClass = 'block text-[11px] font-semibold text-[#2E4839] mb-1';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D261A]/40 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-emerald-100 rounded-2xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-100 bg-[#F6F9F7] flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              HOJA DE VIDA TÉCNICA MECATRÓNICA · ID #{equipo.id_equipo}
            </p>
            <h3 className="text-xl font-bold text-[#14281D] mt-0.5">{equipo.nombre_equipo}</h3>
            <p className="text-xs text-[#526B5C] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                <strong className="text-[#14281D]">Marca:</strong>{' '}
                {equipo.marca || equipo.fabricante || 'N/A'}
              </span>
              <span>·</span>
              <span>
                <strong className="text-[#14281D]">Modelo:</strong> {equipo.modelo || 'N/A'}
              </span>
              <span>·</span>
              <span>
                <strong className="text-[#14281D]">Laboratorio:</strong>{' '}
                {equipo.nombre_laboratorio || 'Sin laboratorio asignado'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => setEditando(!editando)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  editando
                    ? 'bg-white border border-emerald-200 text-[#14281D]'
                    : 'bg-[#1B5E43] text-white hover:bg-[#144732]'
                }`}
              >
                <Pencil size={14} />
                {editando ? 'Cancelar edición' : 'Editar información'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-800 hover:bg-emerald-100/70 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {!readOnly && editando ? (
            /* ===============================================================
               MODO EDICIÓN COMPLETA (SOLO ADMINISTRADOR)
               =============================================================== */
            <form onSubmit={handleGuardarEdicion} className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#FAFDFB] border border-emerald-200 space-y-4">
                <h4 className="text-sm font-bold text-[#14281D] border-b border-emerald-100 pb-2">
                  1. Editar Datos del Equipo, Ubicación y Series
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className={labelClass}>Nombre del Equipo *</label>
                    <input
                      type="text"
                      required
                      value={form.nombre_equipo}
                      onChange={(e) => updateForm('nombre_equipo', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Marca *</label>
                    <input
                      type="text"
                      required
                      value={form.marca}
                      onChange={(e) => updateForm('marca', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Modelo *</label>
                    <input
                      type="text"
                      required
                      value={form.modelo}
                      onChange={(e) => updateForm('modelo', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Serie Universidad (U_Serie) *</label>
                    <input
                      type="text"
                      required
                      value={form.serie_universidad}
                      onChange={(e) => updateForm('serie_universidad', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Serie Laboratorio (Lab_Serie) *</label>
                    <input
                      type="text"
                      required
                      value={form.serie_laboratorio}
                      onChange={(e) => updateForm('serie_laboratorio', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Serie Fábrica (Serie) *</label>
                    <input
                      type="text"
                      required
                      value={form.serie_equipo}
                      onChange={(e) => updateForm('serie_equipo', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Estado *</label>
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
                  <div>
                    <label className={labelClass}>Sede</label>
                    <select
                      value={form.id_sede}
                      onChange={(e) => {
                        updateForm('id_sede', e.target.value);
                        updateForm('id_laboratorio', '');
                      }}
                      className={inputClass}
                    >
                      <option value="">-- Seleccionar sede --</option>
                      {(catalogos.sedes || []).map((s) => (
                        <option key={s.id_sede} value={s.id_sede}>
                          {s.nombre_sede}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Laboratorio Asignado</label>
                    <select
                      value={form.id_laboratorio}
                      onChange={(e) => updateForm('id_laboratorio', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Sin laboratorio asignado --</option>
                      {laboratoriosDeSede.map((l) => (
                        <option key={l.id_laboratorio} value={l.id_laboratorio}>
                          {l.nombre_laboratorio}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <div>
                    <label className={labelClass}>Proveedor Comercial</label>
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
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de Adquisición</label>
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
                  </div>
                  <div>
                    <label className={labelClass}>Valor de Adquisición ($ COP)</label>
                    <input
                      type="text"
                      value={form.valor_adquisicion}
                      onChange={(e) => updateForm('valor_adquisicion', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Responsable del Equipo</label>
                    <input
                      type="text"
                      value={form.responsable_equipo}
                      onChange={(e) => updateForm('responsable_equipo', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Observaciones</label>
                    <input
                      type="text"
                      value={form.observaciones}
                      onChange={(e) => updateForm('observaciones', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Editar Especificaciones Técnicas */}
              <div className="p-5 rounded-2xl bg-[#FAFDFB] border border-emerald-200 space-y-4">
                <h4 className="text-sm font-bold text-[#14281D] border-b border-emerald-100 pb-2">
                  2. Editar Especificaciones Técnicas
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className={labelClass}>Tipo de Alimentación</label>
                    <select
                      value={form.id_fuente}
                      onChange={(e) => updateForm('id_fuente', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Seleccionar --</option>
                      {(catalogos.fuentes_alimentacion || []).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tecnología</label>
                    <select
                      value={form.id_tecnologia}
                      onChange={(e) => updateForm('id_tecnologia', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">-- Seleccionar --</option>
                      {(catalogos.tecnologias || []).map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Rango de Voltaje</label>
                    <input
                      type="text"
                      value={espForm.rango_voltaje}
                      onChange={(e) => updateEsp('rango_voltaje', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Corriente</label>
                    <input
                      type="text"
                      value={espForm.corriente}
                      onChange={(e) => updateEsp('corriente', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Frecuencia</label>
                    <input
                      type="text"
                      value={espForm.frecuencia}
                      onChange={(e) => updateEsp('frecuencia', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Potencia</label>
                    <input
                      type="text"
                      value={espForm.potencia}
                      onChange={(e) => updateEsp('potencia', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dimensiones (mm)</label>
                    <input
                      type="text"
                      value={espForm.dimensiones_mm}
                      onChange={(e) => updateEsp('dimensiones_mm', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Peso</label>
                    <input
                      type="text"
                      value={espForm.peso}
                      onChange={(e) => updateEsp('peso', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Señal de Salida</label>
                    <input
                      type="text"
                      value={espForm.senal_salida}
                      onChange={(e) => updateEsp('senal_salida', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Editar Componentes y Accesorios (Igual al formato de Biomédica) */}
              <div className="p-5 rounded-2xl bg-[#FAFDFB] border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#14281D]">
                    3. Componentes y Accesorios ({componentesForm.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setComponentesForm((prev) => [
                        ...prev,
                        { nombre_componente: '', marca: '', modelo: '', serie_referencia: '' },
                      ])
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#EEF6F1] text-[#1B5E43] text-xs font-semibold hover:bg-[#1B5E43] hover:text-white flex items-center gap-1"
                  >
                    <Plus size={14} /> Agregar componente
                  </button>
                </div>

                {componentesForm.length === 0 ? (
                  <p className="text-xs text-[#6B8576] bg-white p-3.5 rounded-xl border border-emerald-100">
                    Sin componentes registrados. Haz clic en &ldquo;Agregar componente&rdquo; si el equipo cuenta con partes o accesorios.
                  </p>
                ) : (
                  componentesForm.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center bg-white p-2.5 rounded-xl border border-emerald-100"
                    >
                      <input
                        type="text"
                        placeholder="Nombre componente *"
                        value={c.nombre_componente}
                        onChange={(e) =>
                          setComponentesForm((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, nombre_componente: e.target.value } : item
                            )
                          )
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Marca"
                        value={c.marca}
                        onChange={(e) =>
                          setComponentesForm((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, marca: e.target.value } : item
                            )
                          )
                        }
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Modelo"
                        value={c.modelo}
                        onChange={(e) =>
                          setComponentesForm((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, modelo: e.target.value } : item
                            )
                          )
                        }
                        className={inputClass}
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Serie / Ref."
                          value={c.serie_referencia}
                          onChange={(e) =>
                            setComponentesForm((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, serie_referencia: e.target.value } : item
                              )
                            )
                          }
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setComponentesForm((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="p-2 rounded-xl text-[#6B8576] hover:bg-emerald-50 hover:text-[#14281D]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-[#14281D]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="px-5 py-2 rounded-xl bg-[#1B5E43] text-white text-xs font-semibold hover:bg-[#144732] flex items-center gap-1.5"
                >
                  <Check size={15} />
                  {guardandoEdicion ? 'Guardando cambios...' : 'Guardar cambios de la Hoja de Vida'}
                </button>
              </div>
            </form>
          ) : (
            /* ===============================================================
               DISEÑO DE HOJA DE VIDA EN 2 COLUMNAS (MECATRÓNICA)
               =============================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* COLUMNA IZQUIERDA (5 cols): FOTO DEL EQUIPO + DATASHEETS PDF */}
              <div className="lg:col-span-5 space-y-5">
                {/* 1. FOTO DEL EQUIPO */}
                <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-[#FAFDFB]">
                  <div className="px-4 py-3 bg-[#F6F9F7] border-b border-emerald-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#14281D] flex items-center gap-2">
                      <ImageIcon size={16} className="text-[#1B5E43]" />
                      Foto del Equipo
                    </h4>
                    <span className="text-[11px] font-semibold text-[#6B8576]">
                      {imagenes.length} {imagenes.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {fotoPrincipal ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-white aspect-4/3 flex items-center justify-center">
                        <a
                          href={fotoPrincipal.ruta_imagen}
                          target="_blank"
                          rel="noreferrer"
                          title="Haz clic para abrir la foto en tamaño completo"
                          className="w-full h-full flex items-center justify-center"
                        >
                          <img
                            src={fotoPrincipal.ruta_imagen}
                            alt={fotoPrincipal.descripcion_imagen || equipo.nombre_equipo}
                            className="w-full h-full object-contain bg-[#F6F9F7]"
                          />
                        </a>
                        {!readOnly && (
                          <button
                            type="button"
                            title="Eliminar esta fotografía"
                            onClick={() => handleEliminarImagen(fotoPrincipal.id_imagen)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-[#14281D] hover:bg-white shadow-xs"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-emerald-200 bg-white aspect-4/3 flex flex-col items-center justify-center text-[#8BA395] gap-1.5">
                        <ImageIcon size={28} />
                        <span className="text-xs font-medium">Sin fotografía cargada</span>
                      </div>
                    )}

                    {/* Miniaturas cuando hay varias fotos */}
                    {imagenes.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {imagenes.map((img, idx) => (
                          <button
                            key={img.id_imagen || idx}
                            type="button"
                            onClick={() => setFotoActivaIdx(idx)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all bg-white ${
                              idx === fotoActivaIdx
                                ? 'border-[#1B5E43] ring-2 ring-emerald-200'
                                : 'border-emerald-100 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={img.ruta_imagen}
                              alt={img.descripcion_imagen || `Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Subir nueva foto (solo Admin) */}
                    {!readOnly && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={descImg}
                          onChange={(e) => setDescImg(e.target.value)}
                          placeholder="Descripción de la foto..."
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl"
                        />
                        <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#1B5E43] text-white text-xs font-semibold hover:bg-[#144732] flex items-center gap-1.5 shrink-0">
                          <Upload size={13} />
                          {subiendoImg ? 'Subiendo...' : 'Subir Fotos'}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleSubirImagen}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. DATASHEETS Y MANUALES TÉCNICOS */}
                <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-[#FAFDFB]">
                  <div className="px-4 py-3 bg-[#F6F9F7] border-b border-emerald-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#14281D] flex items-center gap-2">
                      <FileText size={16} className="text-[#1B5E43]" />
                      Datasheets y Manuales Técnicos ({documentos.length})
                    </h4>
                    {!readOnly && (
                      <label className="cursor-pointer px-3 py-1 rounded-xl bg-[#1B5E43] text-white text-xs font-semibold hover:bg-[#144732] flex items-center gap-1.5 shrink-0">
                        <Upload size={12} />
                        {subiendoDoc ? 'Subiendo...' : 'Subir PDF'}
                        <input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={handleSubirDatasheet}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    {documentos.length > 0 ? (
                      documentos.map((d, idx) => {
                        const nombreArchivo =
                          d.nombre_archivo ||
                          (d.ruta_archivo_pdf || '').split('/').pop() ||
                          `Datasheet #${idx + 1}`;
                        return (
                          <div
                            key={d.id_documento || idx}
                            className="px-3 py-2.5 rounded-xl bg-white border border-emerald-100 flex items-center justify-between text-xs hover:border-emerald-400 transition-colors gap-2"
                          >
                            <a
                              href={d.ruta_archivo_pdf}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[#14281D] flex items-center gap-2 flex-1 truncate"
                            >
                              <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                              <span className="truncate">{nombreArchivo}</span>
                              <ExternalLink
                                size={13}
                                className="text-emerald-700 shrink-0 ml-auto"
                              />
                            </a>
                            {!readOnly && (
                              <button
                                type="button"
                                title="Eliminar Datasheet"
                                onClick={() => handleEliminarDocumento(d.id_documento)}
                                className="p-1 rounded-lg text-[#6B8576] hover:bg-emerald-50 hover:text-[#14281D]"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-[#526B5C]">
                        No hay datasheets PDF cargados para este equipo.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA (7 cols): INFORMACIÓN TÉCNICA DE MECATRÓNICA */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Datos de Identificación y Ubicación */}
                <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-[#F6F9F7] border-b border-emerald-100">
                    <h4 className="text-sm font-bold text-[#14281D]">
                      Información General e Identificación
                    </h4>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {camposGenerales.map(([label, val]) => (
                      <div
                        key={label}
                        className="p-3 rounded-xl bg-[#FAFDFB] border border-emerald-100/90"
                      >
                        <p className="text-[11px] text-[#526B5C] font-medium">{label}</p>
                        <p className="text-xs font-bold text-[#14281D] mt-0.5 truncate">
                          {val || '—'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {equipo.observaciones && (
                    <div className="px-4 pb-4">
                      <div className="p-3 rounded-xl bg-[#FAFDFB] border border-emerald-100 text-xs">
                        <span className="font-bold text-[#14281D]">Observaciones: </span>
                        <span className="text-[#526B5C]">{equipo.observaciones}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Especificaciones Técnicas (Bases_de_Mecatronica) */}
                <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-[#F6F9F7] border-b border-emerald-100 flex items-center gap-2">
                    <Cpu size={16} className="text-[#1B5E43]" />
                    <h4 className="text-sm font-bold text-[#14281D]">
                      Especificaciones Técnicas
                    </h4>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Tipo de Alimentación</span>
                      <p className="font-bold text-[#14281D] mt-0.5">
                        {equipo.fuente_descripcion || esp.fuente_descripcion || '—'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Tecnología</span>
                      <p className="font-bold text-[#14281D] mt-0.5">
                        {equipo.tecnologia_descripcion || esp.tecnologia_descripcion || '—'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Rango de Voltaje</span>
                      <p className="font-bold text-[#14281D] mt-0.5">
                        {esp.rango_voltaje || '—'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Corriente</span>
                      <p className="font-bold text-[#14281D] mt-0.5">{esp.corriente || '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Frecuencia</span>
                      <p className="font-bold text-[#14281D] mt-0.5">{esp.frecuencia || '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Potencia</span>
                      <p className="font-bold text-[#14281D] mt-0.5">{esp.potencia || '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Dimensiones (mm)</span>
                      <p className="font-bold text-[#14281D] mt-0.5">
                        {esp.dimensiones_mm || '—'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Peso</span>
                      <p className="font-bold text-[#14281D] mt-0.5">{esp.peso || '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAFDFB] border border-emerald-100/80">
                      <span className="text-[11px] text-[#526B5C]">Señal de Salida</span>
                      <p className="font-bold text-[#14281D] mt-0.5">
                        {esp.senal_salida || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Componentes y Accesorios (Igual al formato de Biomédica) */}
                <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-[#F6F9F7] border-b border-emerald-100 flex items-center gap-2">
                    <Layers size={16} className="text-[#1B5E43]" />
                    <h4 className="text-sm font-bold text-[#14281D]">
                      Componentes y Accesorios ({(equipo.componentes || []).length})
                    </h4>
                  </div>
                  <div className="p-4">
                    {(equipo.componentes || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {equipo.componentes.map((c, idx) => (
                          <div
                            key={c.id_componente || idx}
                            className="p-3 rounded-xl bg-[#FAFDFB] border border-emerald-100 text-xs"
                          >
                            <p className="font-bold text-[#14281D]">{c.nombre_componente}</p>
                            <p className="text-[#526B5C]">
                              Marca: {c.marca || '—'} · Modelo: {c.modelo || '—'} · Serie:{' '}
                              {c.serie_referencia || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#526B5C]">
                        Sin componentes adicionales registrados.
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Historial de Mantenimientos (Solo visible en el Panel de Administrador, sin Calibración) */}
                {!readOnly && (
                  <div className="rounded-2xl border border-emerald-100 overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-[#F6F9F7] border-b border-emerald-100 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#14281D] flex items-center gap-2">
                        <Wrench size={15} className="text-[#1B5E43]" />
                        Historial de Mantenimientos ({mantenimientosEquipo.length})
                      </h4>
                    </div>
                    <div className="p-4 space-y-2">
                      {mantenimientosEquipo.length > 0 ? (
                        mantenimientosEquipo.map((m) => (
                          <div
                            key={m.id_registro_mantenimiento}
                            className="p-3 rounded-xl bg-[#FAFDFB] border border-emerald-100 text-xs flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-bold text-[#14281D]">
                                {m.tipo_mantenimiento || 'Mantenimiento'} · {m.fecha_mantenimiento}
                              </p>
                              <p className="text-[11px] text-[#526B5C]">
                                Resp: {m.responsable_mantenimiento || '—'} · Costo: $
                                {Number(m.costo || 0).toLocaleString('es-CO')}
                                {m.notas ? ` · Notas: ${m.notas}` : ''}
                              </p>
                            </div>
                            {m.ruta_evidencia && (
                              <a
                                href={m.ruta_evidencia}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-[#E7F5ED] text-[#145338] font-semibold text-[11px] shrink-0"
                              >
                                Ver Evidencia
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#526B5C]">
                          Sin mantenimientos registrados para este equipo.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
