"use client";

import { useState, useEffect } from "react";
import { BACKEND_URL } from "@/lib/config";
import {
  obtenerSolicitudes, actualizarSolicitud, actualizarEstadoFactura,
  type SolicitudDevolucion,
} from "@/lib/transacciones";

const TIPO_LABEL: Record<string, string> = { ANULACION: "Anulacion", DEVOLUCION: "Devolucion" };

interface ModalDecision {
  solicitud: SolicitudDevolucion;
  decision: "APROBADA" | "RECHAZADA";
  motivo: string;
  enviando: boolean;
}

export default function AdminReclamaciones() {
  const [solicitudes,  setSolicitudes]  = useState<SolicitudDevolucion[]>([]);
  const [modal,        setModal]        = useState<ModalDecision | null>(null);
  const [notificacion, setNotificacion] = useState<{ msg: string; tipo: "ok" | "error" } | null>(null);

  useEffect(() => { setSolicitudes(obtenerSolicitudes()); }, []);

  const reclamadas = solicitudes.filter((s) => s.estado === "RECLAMADA");
  const resueltas  = solicitudes.filter((s) => s.estado === "RESUELTA_ADMIN");

  const mostrar = (msg: string, tipo: "ok" | "error") => {
    setNotificacion({ msg, tipo });
    setTimeout(() => setNotificacion(null), 6000);
  };

  const abrirDecision = (s: SolicitudDevolucion, decision: "APROBADA" | "RECHAZADA") =>
    setModal({ solicitud: s, decision, motivo: "", enviando: false });

  const confirmarDecision = async () => {
    if (!modal || !modal.motivo.trim()) return;
    setModal((m) => m ? { ...m, enviando: true } : null);
    const s = modal.solicitud;
    if (modal.decision === "APROBADA") {
      actualizarEstadoFactura(s.facturaId, s.tipo === "ANULACION" ? "ANULADA" : "REEMBOLSADA");
    }
    actualizarSolicitud(s.id, { estado: "RESUELTA_ADMIN", adminDecision: modal.decision, adminMotivo: modal.motivo.trim(), fechaAdminResolucion: new Date().toISOString() });
    setSolicitudes(obtenerSolicitudes());
    fetch(`${BACKEND_URL}/devoluciones/admin-resolver`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solicitudId: s.id, facturaId: s.facturaId, pedidoId: s.pedidoId, emailComprador: s.emailComprador, monto: s.monto, tipo: s.tipo, decision: modal.decision, adminMotivo: modal.motivo.trim() }) }).catch(() => {});
    setModal(null);
    mostrar(modal.decision === "APROBADA" ? "Solicitud aprobada. Se notifico a comprador y vendedor." : "Rechazo mantenido. Se notifico a comprador y vendedor.", "ok");
  };

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">Administrador</p>
            <h1 className="text-2xl font-black text-slate-900">Panel de Mediacion</h1>
            <p className="text-sm text-slate-500 mt-0.5">Reclamaciones escaladas para revision imparcial</p>
          </div>
        </div>

        {/* Notificacion */}
        {notificacion && (
          <div className={`mb-6 rounded-2xl border p-4 flex items-start gap-3 ${notificacion.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-sm font-medium">{notificacion.msg}</p>
          </div>
        )}

        {/* Metricas */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pendientes de revision", val: reclamadas.length,                      color: "text-violet-700", bg: "bg-violet-100" },
            { label: "Resueltas por admin",    val: resueltas.length,                       color: "text-indigo-700", bg: "bg-indigo-100" },
            { label: "Total reclamaciones",    val: reclamadas.length + resueltas.length,   color: "text-slate-900",  bg: "bg-slate-100"  },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
              </div>
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">{label}</p>
              <p className={`text-3xl font-black ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* ── PENDIENTES ── */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Pendientes de revision</h2>
          {reclamadas.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">{reclamadas.length}</span>}
        </div>

        {reclamadas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-14 text-center mb-10">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
            </div>
            <p className="font-semibold text-slate-600">No hay reclamaciones pendientes</p>
            <p className="text-sm text-slate-400 mt-1">Cuando un comprador escale una solicitud rechazada aparecera aqui.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-10">
            {reclamadas.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm overflow-hidden">

                {/* Cabecera */}
                <div className="bg-violet-50 px-6 py-3.5 border-b border-violet-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">{s.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">RECLAMADA</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.tipo === "ANULACION" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"}`}>{TIPO_LABEL[s.tipo]}</span>
                  </div>
                  <span className="text-xs text-slate-400">Reclamada: {s.fechaReclamacion ? new Date(s.fechaReclamacion).toLocaleString("es-CO") : "—"}</span>
                </div>

                <div className="px-6 py-5">
                  {/* Datos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    {[
                      { label: "Factura",   val: s.facturaId,                              mono: true },
                      { label: "Pedido",    val: s.pedidoId                                          },
                      { label: "Comprador", val: s.emailComprador || "—"                             },
                      { label: "Monto",     val: `$${s.monto.toLocaleString("es-CO")} COP`, bold: true },
                    ].map(({ label, val, mono, bold }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-0.5">{label}</p>
                        <p className={`text-sm truncate ${mono ? "font-mono text-xs" : ""} ${bold ? "font-bold text-slate-900" : "text-slate-700"}`}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Las tres perspectivas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Solicitud del comprador</p>
                      <p className="text-sm text-indigo-900 font-medium mb-1">{s.motivo}</p>
                      {s.descripcion && <p className="text-xs text-indigo-700">{s.descripcion}</p>}
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-rose-600 uppercase mb-2">Rechazo del vendedor</p>
                      <p className="text-sm text-rose-900">{s.motivoRechazo || "—"}</p>
                      {s.detalleRechazo && <p className="text-xs text-rose-600 mt-1 italic">{s.detalleRechazo}</p>}
                    </div>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-violet-600 uppercase mb-2">Argumento del comprador</p>
                      <p className="text-sm text-violet-900">{s.reclamacion || "—"}</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">Decision:</span>
                    <button onClick={() => abrirDecision(s, "APROBADA")} className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm">
                      Aprobar solicitud del comprador
                    </button>
                    <button onClick={() => abrirDecision(s, "RECHAZADA")} className="px-5 py-2.5 border-2 border-rose-300 text-rose-700 text-sm font-bold rounded-xl hover:bg-rose-50 transition">
                      Mantener rechazo del vendedor
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── RESUELTAS ── */}
        {resueltas.length > 0 && (
          <>
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Resueltas por administrador ({resueltas.length})</h2>
            <div className="space-y-3">
              {resueltas.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500">{s.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.adminDecision === "APROBADA" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {s.adminDecision === "APROBADA" ? "APROBADA POR ADMIN" : "RECHAZO MANTENIDO"}
                      </span>
                      <span className="text-xs text-slate-400">{TIPO_LABEL[s.tipo]}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Pedido: <span className="font-medium text-slate-700">{s.pedidoId}</span> · Comprador: <span className="font-medium text-slate-700">{s.emailComprador}</span> · ${s.monto.toLocaleString("es-CO")} COP
                    </p>
                    {s.adminMotivo && <p className="text-xs text-slate-500 mt-1 italic">&quot;{s.adminMotivo}&quot;</p>}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{s.fechaAdminResolucion ? new Date(s.fechaAdminResolucion).toLocaleString("es-CO") : ""}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── MODAL DECISION ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-black text-slate-900 mb-1">
              {modal.decision === "APROBADA" ? "Aprobar solicitud del comprador" : "Mantener rechazo del vendedor"}
            </h2>
            <p className="text-xs text-slate-500 mb-5">{TIPO_LABEL[modal.solicitud.tipo]} · {modal.solicitud.facturaId} · ${modal.solicitud.monto.toLocaleString("es-CO")} COP</p>

            <div className={`rounded-xl border p-4 mb-5 ${modal.decision === "APROBADA" ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              <p className={`text-xs font-bold uppercase mb-1 ${modal.decision === "APROBADA" ? "text-emerald-700" : "text-rose-700"}`}>
                {modal.decision === "APROBADA"
                  ? `La factura quedara como ${modal.solicitud.tipo === "ANULACION" ? "ANULADA" : "REEMBOLSADA"}`
                  : "El rechazo del vendedor quedara como definitivo"}
              </p>
              <p className={`text-xs ${modal.decision === "APROBADA" ? "text-emerald-800" : "text-rose-800"}`}>
                Se notificara a ambas partes con tu decision y justificacion.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Justificacion *</label>
              <textarea value={modal.motivo} onChange={(e) => setModal((m) => m ? { ...m, motivo: e.target.value } : null)} placeholder="Explica el razonamiento de tu decision. Sera visible para ambas partes..." rows={4} className={inputCls + " resize-none"} />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={confirmarDecision} disabled={!modal.motivo.trim() || modal.enviando}
                className={`flex-1 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 ${modal.decision === "APROBADA" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {modal.enviando ? "Procesando..." : "Confirmar decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
