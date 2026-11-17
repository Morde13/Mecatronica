import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  FlaskConical,
  Check,
  RotateCcw,
  Trash2,
  Pencil,
  X,
  QrCode,
} from 'lucide-react';
import { api } from '../services/api';
import EquipoSearchSelect from '../components/EquipoSearchSelect';
import QrBarcodeScannerModal from '../components/QrBarcodeScannerModal';

function formatearFecha(iso) {
  if (!iso) return 'Pendiente';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PrestamosView({
  prestamos,
  equipos,
  esquemaListo,
  onRefresh,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoPrestamoId, setEditandoPrestamoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [scannerModo, setScannerModo] = useState(null);

  const hoyIso = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    equipos_ids: [],
    codigo_estudiante: '',
    fecha_prestamo: hoyIso,
    fecha_devolucion: '',
    estado_prestamo: 'Activo',
    observaciones: '',
  });

  // Agrupar siempre por id_prestamo (y si un mismo código de estudiante tiene varios registros activos en caché, unificarlos en una sola fila)
  const prestamosAgrupados = useMemo(() => {
    const mapa = new Map();

    (prestamos || []).forEach((p) => {
      const clave = String(p.id_prestamo);
      const itemsEntrantes =
        Array.isArray(p.equipos_prestados) && p.equipos_prestados.length > 0
          ? p.equipos_prestados
          : p.id_equipo
          ? [
              {
                id_detalle: p.id_detalle,
                id_equipo: p.id_equipo,
                nombre_equipo: p.nombre_equipo || 'Equipo',
                serie_equipo: p.serie_equipo,
                serie_universidad: p.serie_universidad,
                serie_laboratorio: p.serie_laboratorio,
                id_laboratorio: p.id_laboratorio,
              },
            ]
          : [];

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          ...p,
          equipos_prestados: [...itemsEntrantes],
        });
      } else {
        const existente = mapa.get(clave);
        const idsExistentes = new Set(
          existente.equipos_prestados.map((e) => Number(e.id_equipo))
        );
        itemsEntrantes.forEach((item) => {
          if (!idsExistentes.has(Number(item.id_equipo))) {
            existente.equipos_prestados.push(item);
            idsExistentes.add(Number(item.id_equipo));
          }
        });
      }
    });

    return Array.from(mapa.values());
  }, [prestamos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return prestamosAgrupados;
    return prestamosAgrupados.filter((p) => {
      const textoEquipos = (p.equipos_prestados || [])
        .map(
          (eq) =>
            `${eq.nombre_equipo || ''} ${eq.serie_equipo || ''} ${
              eq.serie_universidad || ''
            } ${eq.serie_laboratorio || ''}`
        )
        .join(' ');
      const texto = `${textoEquipos} ${p.nombre_equipo || ''} ${
        p.codigo_estudiante || p.codigo_universidad || ''
      } ${p.estado_prestamo || ''} ${p.observaciones || ''}`.toLowerCase();
      return texto.includes(q);
    });
  }, [prestamosAgrupados, busqueda]);

  const totalRegistros = String(prestamosAgrupados.length).padStart(2, '0');
  const activosOVencidos = String(
    prestamosAgrupados.filter(
      (p) => (p.estado_prestamo || '').toLowerCase() !== 'devuelto'
    ).length
  ).padStart(2, '0');

  const equiposRelacionados = useMemo(() => {
    const setIds = new Set();
    prestamosAgrupados.forEach((p) => {
      (p.equipos_prestados || []).forEach((eq) => {
        if (eq.id_equipo) setIds.add(Number(eq.id_equipo));
      });
    });
    return String(setIds.size).padStart(2, '0');
  }, [prestamosAgrupados]);

  const handleCodigoDetectado = (codigo) => {
    if (scannerModo === 'historial') {
      setBusqueda(codigo);
      return;
    }

    if (scannerModo === 'formulario') {
      const q = codigo.toLowerCase();
      const encontrado = equipos.find(
        (eq) =>
          (eq.serie_universidad || '').toLowerCase() === q ||
          (eq.serie_laboratorio || '').toLowerCase() === q ||
          (eq.serie_equipo || '').toLowerCase() === q ||
          `${eq.nombre_equipo} ${eq.serie_universidad || ''} ${eq.serie_laboratorio || ''}`
            .toLowerCase()
            .includes(q)
      );
      if (encontrado) {
        const strId = String(encontrado.id_equipo);
        setForm((prev) => ({
          ...prev,
          equipos_ids: prev.equipos_ids.includes(strId)
            ? prev.equipos_ids
            : [...prev.equipos_ids, strId],
        }));
      } else {
        alert(`No se encontró un equipo con el código o serie "${codigo}".`);
      }
    }
  };

  const abrirNuevoPrestamo = () => {
    if (mostrarForm && !editandoPrestamoId) {
      setMostrarForm(false);
      return;
    }
    setEditandoPrestamoId(null);
    setForm({
      equipos_ids: [],
      codigo_estudiante: '',
      fecha_prestamo: hoyIso,
      fecha_devolucion: '',
      estado_prestamo: 'Activo',
      observaciones: '',
    });
    setMostrarForm(true);
  };

  const iniciarEdicion = (prestamo) => {
    const ids = (prestamo.equipos_prestados || [])
      .map((e) => e.id_equipo)
      .filter(Boolean)
      .map(String);

    setEditandoPrestamoId(prestamo.id_prestamo);
    setForm({
      equipos_ids: ids,
      codigo_estudiante: prestamo.codigo_estudiante || prestamo.codigo_universidad || '',
      fecha_prestamo: (prestamo.fecha_prestamo || hoyIso).slice(0, 10),
      fecha_devolucion: prestamo.fecha_devolucion
        ? prestamo.fecha_devolucion.slice(0, 10)
        : '',
      estado_prestamo: prestamo.estado_prestamo || 'Activo',
      observaciones: prestamo.observaciones || '',
    });
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.equipos_ids.length === 0 || !form.codigo_estudiante.trim()) {
      alert('Selecciona al menos un equipo e ingresa el Código de Estudiante.');
      return;
    }
    setGuardando(true);
    try {
      const payload = {
        equipos_ids: form.equipos_ids.map(Number),
        codigo_estudiante: form.codigo_estudiante.trim(),
        fecha_prestamo: form.fecha_prestamo,
        fecha_devolucion: form.fecha_devolucion || null,
        estado_prestamo: form.estado_prestamo,
        observaciones: form.observaciones.trim() || null,
      };

      if (editandoPrestamoId) {
        await api.actualizarPrestamo(editandoPrestamoId, payload, esquemaListo);
      } else {
        await api.crearPrestamo(payload, esquemaListo);
      }

      await onRefresh();
      setEditandoPrestamoId(null);
      setForm({
        equipos_ids: [],
        codigo_estudiante: '',
        fecha_prestamo: hoyIso,
        fecha_devolucion: '',
        estado_prestamo: 'Activo',
        observaciones: '',
      });
      setMostrarForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const marcarDevuelto = async (prestamo) => {
    const obs = window.prompt(
      'Observaciones de devolución (opcional):',
      prestamo.observaciones || 'Recibido conforme en laboratorio.'
    );
    if (obs === null) return;
    await api.actualizarEstadoPrestamo(
      prestamo.id_prestamo,
      {
        estado_prestamo: 'Devuelto',
        fecha_devolucion: new Date().toISOString().slice(0, 10),
        observaciones: obs,
      },
      esquemaListo
    );
    await onRefresh();
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este registro de préstamo?')) return;
    await api.eliminarPrestamo(id, esquemaListo);
    await onRefresh();
  };

  return (
    <div className="space-y-7">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-[#5E7A6B] mb-1.5">
            GESTIÓN DE LABORATORIO &nbsp;/&nbsp; SEGUIMIENTO
          </p>
          <h1 className="text-3xl font-extrabold text-[#14281D] tracking-tight">Préstamos</h1>
          <p className="text-sm text-[#526B5C] mt-1">
            Administra los préstamos de equipos agrupados por estudiante en una misma casilla.
          </p>
        </div>

        <button
          onClick={abrirNuevoPrestamo}
          className="px-5 py-2.5 rounded-xl bg-[#1B5E43] text-white text-sm font-semibold hover:bg-[#144732] transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          {mostrarForm && !editandoPrestamoId ? <X size={17} /> : <Plus size={17} />}
          {mostrarForm && !editandoPrestamoId ? 'Cerrar formulario' : 'Registrar préstamo'}
        </button>
      </div>

      {/* Formulario de Préstamo (Crear o Editar) */}
      {mostrarForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-5 shadow-[0_4px_20px_rgba(20,40,29,0.05)]"
        >
          <div className="border-b border-emerald-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-[#14281D]">
              {editandoPrestamoId
                ? `Modificar Préstamo #${editandoPrestamoId}`
                : 'Registrar Préstamo de Equipo(s)'}
            </h3>
            <span className="text-xs font-semibold text-[#145338] bg-[#E7F5ED] px-3 py-1 rounded-full">
              Todos los equipos seleccionados quedan agrupados en una sola casilla
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-[#2E4839] mb-1.5">
                Equipos Solicitados *
              </label>
              <EquipoSearchSelect
                equipos={equipos}
                multiple={true}
                values={form.equipos_ids}
                onChange={(ids) => setForm({ ...form, equipos_ids: ids })}
                onOpenScanner={() => setScannerModo('formulario')}
                placeholder="-- Buscar por nombre, serie universidad o serie laboratorio y seleccionar equipos --"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2E4839] mb-1.5">
                Código Estudiante *
              </label>
              <input
                type="text"
                required
                value={form.codigo_estudiante}
                onChange={(e) => setForm({ ...form, codigo_estudiante: e.target.value })}
                placeholder="Ej: 202400123"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2E4839] mb-1.5">
                Fecha de Préstamo *
              </label>
              <input
                type="date"
                required
                value={form.fecha_prestamo}
                onChange={(e) => setForm({ ...form, fecha_prestamo: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2E4839] mb-1.5">
                Fecha de Devolución
              </label>
              <input
                type="date"
                value={form.fecha_devolucion}
                onChange={(e) => setForm({ ...form, fecha_devolucion: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-[#1B5E43]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2E4839] mb-1.5">
                Estado *
              </label>
              <select
                value={form.estado_prestamo}
                onChange={(e) => setForm({ ...form, estado_prestamo: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-[#1B5E43]"
              >
                <option value="Activo">Activo</option>
                <option value="Devuelto">Devuelto</option>
                <option value="Vencido">Vencido</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-[#2E4839] mb-1.5">
                Observaciones
              </label>
              <textarea
                rows="2"
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Estado físico del equipo, nombre del estudiante o accesorios entregados..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-[#1B5E43]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setEditandoPrestamoId(null);
              }}
              className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-[#14281D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-xl bg-[#1B5E43] text-white text-xs font-semibold hover:bg-[#144732] flex items-center gap-1.5"
            >
              <Check size={15} />
              {guardando
                ? 'Guardando...'
                : editandoPrestamoId
                ? `Guardar cambios (${form.equipos_ids.length} equipo${
                    form.equipos_ids.length === 1 ? '' : 's'
                  })`
                : form.equipos_ids.length > 1
                ? `Guardar préstamo (${form.equipos_ids.length} equipos)`
                : 'Guardar préstamo'}
            </button>
          </div>
        </form>
      )}

      {/* 3 Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-emerald-100/90 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
          <p className="text-xs font-medium text-[#526B5C]">Total de préstamos</p>
          <p className="text-4xl font-extrabold text-[#14281D] my-2.5 tracking-tight">
            {totalRegistros}
          </p>
          <p className="text-xs text-[#6B8576]">Préstamos registrados por estudiante</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-emerald-100/90 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
          <p className="text-xs font-medium text-[#526B5C]">Activos o vencidos</p>
          <p className="text-4xl font-extrabold text-[#14281D] my-2.5 tracking-tight">
            {activosOVencidos}
          </p>
          <p className="text-xs text-[#6B8576]">Pendientes de devolución</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-emerald-100/90 shadow-[0_2px_12px_rgba(20,40,29,0.03)]">
          <p className="text-xs font-medium text-[#526B5C]">Equipos relacionados</p>
          <p className="text-4xl font-extrabold text-[#14281D] my-2.5 tracking-tight">
            {equiposRelacionados}
          </p>
          <p className="text-xs text-[#6B8576]">Equipos incluidos en préstamos</p>
        </div>
      </div>

      {/* Historial de préstamo */}
      <div className="bg-white rounded-2xl border border-emerald-100/90 shadow-[0_2px_12px_rgba(20,40,29,0.03)] overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#14281D]">Historial de préstamo</h2>
              <p className="text-xs text-[#6B8576] mt-0.5">
                Todos los equipos prestados a un estudiante se muestran agrupados en una sola fila
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#EFF5F1] text-[#234735] text-xs font-semibold">
              {filtrados.length} préstamos
            </span>
          </div>

          <div className="relative w-full md:max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B8576] pointer-events-none"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por equipo, serie o código de estudiante..."
              className="w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-emerald-100 rounded-xl focus:outline-none focus:border-[#1B5E43] placeholder:text-[#8BA395]"
            />
            <button
              type="button"
              onClick={() => setScannerModo('historial')}
              title="Iniciar cámara para buscar préstamo por QR o Código de Barras"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#1B5E43] hover:bg-[#E7F5ED] transition-colors flex items-center justify-center"
            >
              <QrCode size={17} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-emerald-100/80 bg-[#FAFDFB] text-[11px] font-bold uppercase tracking-wider text-[#6B8576]">
                <th className="py-3.5 px-6">Equipo</th>
                <th className="py-3.5 px-4">Código Estudiante</th>
                <th className="py-3.5 px-4">Fecha de préstamo</th>
                <th className="py-3.5 px-4">Devolución</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-6 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 text-sm">
              {filtrados.map((p) => {
                const esDevuelto = (p.estado_prestamo || '').toLowerCase() === 'devuelto';
                const listaEquipos =
                  Array.isArray(p.equipos_prestados) && p.equipos_prestados.length > 0
                    ? p.equipos_prestados
                    : [
                        {
                          id_equipo: p.id_equipo,
                          nombre_equipo: p.nombre_equipo || 'Sin equipo asociado',
                          serie_universidad: p.serie_universidad,
                          serie_laboratorio: p.serie_laboratorio,
                        },
                      ];

                return (
                  <tr
                    key={p.id_prestamo}
                    className="hover:bg-[#F7FBF8] transition-colors align-middle"
                  >
                    {/* Todos los equipos del préstamo agrupados dentro de la misma casilla */}
                    <td className="py-4 px-6">
                      <div className="space-y-2.5">
                        {listaEquipos.map((eqItem, idxEq) => (
                          <div
                            key={eqItem.id_detalle || eqItem.id_equipo || idxEq}
                            className="flex items-center gap-3.5"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#EEF6F1] border border-emerald-100 flex items-center justify-center text-[#1B5E43] shrink-0">
                              <FlaskConical size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-[#14281D]">{eqItem.nombre_equipo}</p>
                              <p className="text-xs text-[#6B8576]">
                                Univ: {eqItem.serie_universidad || '—'} · Lab:{' '}
                                {eqItem.serie_laboratorio || '—'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {p.observaciones && (
                          <p className="text-xs text-[#526B5C] pt-0.5">
                            Obs: {p.observaciones}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-[#14281D]">
                        {p.codigo_estudiante || p.codigo_universidad}
                      </p>
                      <p className="text-xs text-[#6B8576]">
                        Préstamo #{p.id_prestamo}
                        {listaEquipos.length > 1 ? ` · ${listaEquipos.length} equipos` : ''}
                      </p>
                    </td>

                    <td className="py-4 px-4 text-xs font-medium text-[#526B5C]">
                      {formatearFecha(p.fecha_prestamo || p.fecha_hora_prestamo)}
                    </td>

                    <td className="py-4 px-4 text-xs font-medium text-[#526B5C]">
                      {formatearFecha(p.fecha_devolucion || p.fecha_hora_devolucion)}
                    </td>

                    <td className="py-4 px-4">
                      {esDevuelto ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E7F5ED] text-[#145338]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1B5E43]" />
                          Devuelto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#1B5E43] text-[#1B5E43]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1B5E43]" />
                          {p.estado_prestamo || 'Activo'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!esDevuelto && (
                          <button
                            onClick={() => marcarDevuelto(p)}
                            className="px-3 py-1.5 rounded-xl bg-[#EEF6F1] text-[#1B5E43] hover:bg-[#1B5E43] hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5"
                          >
                            <RotateCcw size={13} /> Recibir
                          </button>
                        )}
                        <button
                          onClick={() => iniciarEdicion(p)}
                          title="Modificar préstamo o sus equipos"
                          className="p-2 rounded-xl text-[#6B8576] hover:bg-emerald-50 hover:text-[#1B5E43]"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleEliminar(p.id_prestamo)}
                          title="Eliminar préstamo"
                          className="p-2 rounded-xl text-[#6B8576] hover:bg-emerald-50 hover:text-[#14281D]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-[#6B8576]">
                    No se encontraron préstamos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QrBarcodeScannerModal
        isOpen={Boolean(scannerModo)}
        onClose={() => setScannerModo(null)}
        onDetected={handleCodigoDetectado}
        title={
          scannerModo === 'formulario'
            ? 'Escanear QR / Código de Barras para agregar equipo al préstamo'
            : 'Buscar préstamo por QR o Código de Barras'
        }
      />
    </div>
  );
}
