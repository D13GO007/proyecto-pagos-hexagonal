"use client";

import { useState, useEffect } from "react";
import { BACKEND_URL } from "@/lib/config";
import {
  obtenerSolicitudes, actualizarSolicitud, actualizarEstadoFactura,
  type SolicitudDevolucion,
} from "@/lib/transacciones";
import { generarNotaCreditoPDF } from "@/lib/generarFacturaPDF";

const BADGE: Record<string, string> = {
  PENDIENTE:      "bg-amber-100 text-amber-700",
  APROBADA:       "bg-emerald-100 text-emerald-700",
  RECHAZADA:      "bg-rose-100 text-rose-700",
  RECLAMADA:      "bg-violet-100 text-violet-700",
  RESUELTA_ADMIN: "bg-indigo-100 text-indigo-700",
};

const TIPO_LABEL: Record<string, string> = {
  ANULACION:  "Anulacion",
  DEVOLUCION: "Devolucion",
};

const RAZONES_RECHAZO = [
  "El producto fue entregado en perfecto estado segun la descripcion.",
  "La solicitud esta fuera del plazo de devolucion (30 dias desde la entrega).",
  "El producto muestra senales de uso inadecuado o dano por parte del comprador.",
  "El articulo ya fue utilizado y no admite devolucion por politica de la tienda.",
  "La descripcion del producto era clara y el comprador acepto las condiciones.",
  "La solicitud no incluye evidencia suficiente para procesarla.",
];

interface ModalRechazo {
  solicitud: SolicitudDevolucion;
  razonPredefinida: string;
  detalle: string;
  enviando: boolean;
}

export default function GestionDevoluciones() {
  const [solicitudes,  setSolicitudes]  = useState<SolicitudDevolucion[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modalRechazo, setModalRechazo] = useState<ModalRechazo | null>(null);
  const [notificacion, setNotificacion] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  useEffect(() => { setSolicitudes(obtenerSolicitudes()); }, []);

  const mostrar = (msg: string, tipo: "ok" | "error") => {
    setNotificacion({ msg, tipo });
    setTimeout(() => setNotificacion(null), 5000);
  };

  const filtradas = solicitudes.filter((s) => filtroEstado ? s.estado === filtroEstado : true);
  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;
  const aprobadas  = solicitudes.filter((s) => s.estado === "APROBADA").length;
  const rechazadas = solicitudes.filter((s) => s.estado === "RECHAZADA").length;
  const reclamadas = solicitudes.filter((s) => s.estado === "RECLAMADA").length;

  const aprobar = async (s: SolicitudDevolucion) => {
    const nuevoEstadoFactura = s.tipo === "ANULACION" ? "ANULADA" : "REEMBOLSADA";
    // HU19: generar ID único de reembolso para devoluciones
    const reembolsoId = `REIMB-${Date.now()}`;
    actualizarSolicitud(s.id, {
      estado: "APROBADA",
      fechaResolucion: new Date().toISOString(),
      reembolsoId,
    });
    actualizarEstadoFactura(s.facturaId, nuevoEstadoFactura);
    setSolicitudes(obtenerSolicitudes());
    fetch("${BACKEND_URL}/devoluciones/resolver", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solicitudId: s.id, facturaId: s.facturaId, pedidoId: s.pedidoId, emailComprador: s.emailComprador, monto: s.monto, tipo: s.tipo, motivo: s.motivo, decision: "APROBADA", reembolsoId }) }).catch(() => {});
    mostrar(`Solicitud aprobada. ID reembolso: ${reembolsoId}. Se notifico al cliente (${s.emailComprador}).`, "ok");
  };

  const abrirRechazo = (s: SolicitudDevolucion) =>
    setModalRechazo({ solicitud: s, razonPredefinida: "", detalle: "", enviando: false });

  const confirmarRechazo = async () => {
    if (!modalRechazo || !modalRechazo.razonPredefinida) return;
    setModalRechazo((m) => m ? { ...m, enviando: true } : null);
    const s = modalRechazo.solicitud;
    const motivoCompleto = modalRechazo.detalle.trim()
      ? `${modalRechazo.razonPredefinida} — ${modalRechazo.detalle}`
      : modalRechazo.razonPredefinida;
    actualizarSolicitud(s.id, { estado: "RECHAZADA", motivoRechazo: modalRechazo.razonPredefinida, detalleRechazo: modalRechazo.detalle.trim() || undefined, fechaResolucion: new Date().toISOString() });
    setSolicitudes(obtenerSolicitudes());
    fetch("${BACKEND_URL}/devoluciones/resolver", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solicitudId: s.id, facturaId: s.facturaId, pedidoId: s.pedidoId, emailComprador: s.emailComprador, monto: s.monto, tipo: s.tipo, motivo: s.motivo, decision: "RECHAZADA", motivoRechazo: motivoCompleto }) }).catch(() => {});
    setModalRechazo(null);
    mostrar("Solicitud rechazada. El cliente puede escalar al administrador si no esta de acuerdo.", "ok");
  };

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Vendedor</p>
            <h1 className="text-2xl font-black text-slate-900">Gestion de Devoluciones</h1>
          </div>
        </div>

        {/* Notificacion */}
        {notificacion && (
          <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${notificacion.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-sm font-medium">{notificacion.msg}</p>
          </div>
        )}

        {/* Metricas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total",      val: solicitudes.length, color: "text-slate-900",   bg: "bg-slate-100"   },
            { label: "Pendientes", val: pendientes,          color: "text-amber-700",   bg: "bg-amber-100"   },
            { label: "Aprobadas",  val: aprobadas,           color: "text-emerald-700", bg: "bg-emerald-100" },
            { label: "Rechazadas", val: rechazadas,          color: "text-rose-700",    bg: "bg-rose-100"    },
            { label: "Reclamadas", val: reclamadas,          color: "text-violet-700",  bg: "bg-violet-100"  },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estado:</span>
          {["", "PENDIENTE", "APROBADA", "RECHAZADA", "RECLAMADA", "RESUELTA_ADMIN"].map((e) => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtroEstado === e ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {e === "" ? "Todos" : e === "RESUELTA_ADMIN" ? "Resuelta (Admin)" : e}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">{filtradas.length} resultado(s)</span>
        </div>

        {/* Solicitudes */}
        {filtradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p className="font-semibold text-slate-600">No hay solicitudes</p>
            <p className="text-sm text-slate-400 mt-1">{filtroEstado ? "Ninguna solicitud con ese estado." : "Las solicitudes de clientes apareceran aqui."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtradas.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Cabecera */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{s.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE[s.estado]}`}>
                      {s.estado === "RESUELTA_ADMIN" ? "RESUELTA (ADMIN)" : s.estado}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.tipo === "ANULACION" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"}`}>
                      {TIPO_LABEL[s.tipo]}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(s.fechaSolicitud).toLocaleString("es-CO")}</span>
                </div>

                {/* Detalle */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                      { label: "Factura",  val: s.facturaId,                                  mono: true  },
                      { label: "Pedido",   val: s.pedidoId                                                },
                      { label: "Cliente",  val: s.emailComprador || "—"                                   },
                      { label: "Monto",    val: `$${s.monto.toLocaleString("es-CO")} COP`,    bold: true  },
                    ].map(({ label, val, mono, bold }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-0.5">{label}</p>
                        <p className={`text-sm truncate ${mono ? "font-mono text-xs text-slate-700" : ""} ${bold ? "font-bold text-slate-900" : "text-slate-700"}`}>{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3.5 mb-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Motivo del cliente</p>
                    <p className="text-sm text-slate-800 font-medium">{s.motivo}</p>
                    {s.descripcion && <p className="text-xs text-slate-500 mt-1">{s.descripcion}</p>}
                  </div>

                  {s.estado === "RECHAZADA" && s.motivoRechazo && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-4">
                      <p className="text-xs font-bold text-rose-700 uppercase mb-1">Razon de rechazo</p>
                      <p className="text-sm text-rose-800">{s.motivoRechazo}</p>
                      {s.detalleRechazo && <p className="text-xs text-rose-600 mt-0.5 italic">{s.detalleRechazo}</p>}
                    </div>
                  )}

                  {s.estado === "RECLAMADA" && s.reclamacion && (
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5 mb-4">
                      <p className="text-xs font-bold text-violet-700 uppercase mb-1">Reclamacion escalada al admin</p>
                      <p className="text-sm text-violet-800">{s.reclamacion}</p>
                    </div>
                  )}

                  {s.fechaResolucion && (
                    <p className="text-xs text-slate-400 mb-4">Resuelta el {new Date(s.fechaResolucion).toLocaleString("es-CO")}</p>
                  )}

                  {s.estado === "PENDIENTE" && (
                    <div className="flex gap-2">
                      <button onClick={() => aprobar(s)} className="px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition">
                        Aprobar {s.tipo === "ANULACION" ? "anulacion" : "devolucion"}
                      </button>
                      <button onClick={() => abrirRechazo(s)} className="px-5 py-2 border border-rose-300 text-rose-700 text-sm font-bold rounded-xl hover:bg-rose-50 transition">
                        Rechazar
                      </button>
                    </div>
                  )}

                  {/* HU08/HU19: Nota de Crédito descargable cuando la solicitud está aprobada */}
                  {s.estado === "APROBADA" && s.reembolsoId && (
                    <div className="flex items-center gap-3 mt-1 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-800">Nota de Crédito generada</p>
                        <p className="text-xs text-emerald-700 font-mono">{s.reembolsoId}</p>
                      </div>
                      <button
                        onClick={() => generarNotaCreditoPDF(
                          s.facturaId,
                          s.reembolsoId!,
                          s.monto,
                          s.motivo,
                          s.emailComprador,
                          s.tipo,
                          s.fechaResolucion || new Date().toISOString(),
                        )}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                        </svg>
                        Descargar Nota de Crédito
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL RECHAZO ── */}
      {modalRechazo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-black text-slate-900 mb-1">Rechazar solicitud</h2>
            <p className="text-xs text-slate-500 mb-5">{TIPO_LABEL[modalRechazo.solicitud.tipo]} · {modalRechazo.solicitud.facturaId}</p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Aviso</p>
              <p className="text-xs text-amber-800">El cliente podra escalar esta decision al administrador si no esta de acuerdo. Selecciona solo motivos validos y verificables.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 mb-5 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Solicitud del cliente</p>
              <p className="text-sm text-slate-800 font-medium">{modalRechazo.solicitud.motivo}</p>
              {modalRechazo.solicitud.descripcion && <p className="text-xs text-slate-500 mt-0.5">{modalRechazo.solicitud.descripcion}</p>}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Razon de rechazo * (selecciona una)</label>
              <div className="space-y-2">
                {RAZONES_RECHAZO.map((r) => (
                  <label key={r} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${modalRechazo.razonPredefinida === r ? "border-rose-400 bg-rose-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name="razonRechazo" value={r} checked={modalRechazo.razonPredefinida === r} onChange={() => setModalRechazo((m) => m ? { ...m, razonPredefinida: r } : null)} className="mt-0.5 accent-rose-600" />
                    <span className="text-sm text-slate-800">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Detalle adicional (opcional)</label>
              <textarea value={modalRechazo.detalle} onChange={(e) => setModalRechazo((m) => m ? { ...m, detalle: e.target.value } : null)} placeholder="Agrega evidencia o contexto adicional..." rows={2} className={inputCls + " resize-none"} />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModalRechazo(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={confirmarRechazo} disabled={!modalRechazo.razonPredefinida || modalRechazo.enviando} className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition disabled:opacity-50">
                {modalRechazo.enviando ? "Enviando..." : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
