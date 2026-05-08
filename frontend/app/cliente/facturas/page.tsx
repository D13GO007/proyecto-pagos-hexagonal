"use client";

import { useState, useEffect } from "react";
import {
  obtenerFacturas, type Factura,
  guardarSolicitud, obtenerSolicitudPorFactura, actualizarSolicitud, type SolicitudDevolucion,
  actualizarEstadoFactura,
} from "@/lib/transacciones";
import { generarFacturaPDF, generarNotaCreditoPDF } from "@/lib/generarFacturaPDF";

const MOTIVOS_ANULACION = [
  "Cambie de opinion",
  "Encontre mejor precio en otro lugar",
  "Pedi el producto por error",
  "El tiempo de entrega es demasiado largo",
  "Problemas con el metodo de pago",
];

const MOTIVOS_DEVOLUCION = [
  "Producto danado o defectuoso",
  "El producto no corresponde a la descripcion",
  "Recibi un producto equivocado",
  "El producto no funciona correctamente",
  "No era lo que esperaba",
  "Producto incompleto o con piezas faltantes",
];

const BADGE_FACTURA: Record<string, string> = {
  VIGENTE:     "bg-emerald-100 text-emerald-700",
  ANULADA:     "bg-rose-100 text-rose-700",
  REEMBOLSADA: "bg-violet-100 text-violet-700",
};

const BADGE_SOLICITUD: Record<string, string> = {
  PENDIENTE:      "bg-amber-100 text-amber-700",
  APROBADA:       "bg-emerald-100 text-emerald-700",
  RECHAZADA:      "bg-rose-100 text-rose-700",
  RECLAMADA:      "bg-violet-100 text-violet-700",
  RESUELTA_ADMIN: "bg-indigo-100 text-indigo-700",
};

const BADGE_ESTADO: Record<string, string> = {
  APROBADO:  "bg-emerald-100 text-emerald-700",
  PENDIENTE: "bg-amber-100 text-amber-700",
  RECHAZADO: "bg-rose-100 text-rose-700",
};

interface EstadoModal {
  factura: Factura;
  tipo: "ANULACION" | "DEVOLUCION";
  motivo: string;
  descripcion: string;
  enviando: boolean;
}

export default function MisFacturas() {
  const [facturas,        setFacturas]        = useState<Factura[]>([]);
  const [modal,           setModal]           = useState<EstadoModal | null>(null);
  const [exito,           setExito]           = useState<string | null>(null);
  const [modalEscalacion, setModalEscalacion] = useState<{ solicitud: SolicitudDevolucion; reclamacion: string; enviando: boolean } | null>(null);
  const [, rerender]                          = useState(0);

  useEffect(() => { setFacturas(obtenerFacturas()); }, []);

  const abrirModal = (f: Factura) =>
    setModal({ factura: f, tipo: "ANULACION", motivo: "", descripcion: "", enviando: false });

  const motivosActuales = modal?.tipo === "ANULACION" ? MOTIVOS_ANULACION : MOTIVOS_DEVOLUCION;

  const enviarSolicitud = async () => {
    if (!modal || !modal.motivo) return;
    setModal((m) => m ? { ...m, enviando: true } : null);

    const solicitud: SolicitudDevolucion = {
      id:             `SOL-${Date.now()}`,
      facturaId:      modal.factura.id,
      pedidoId:       modal.factura.pedidoId,
      emailComprador: modal.factura.clienteEmail || "",
      monto:          modal.factura.monto,
      tipo:           modal.tipo,
      motivo:         modal.motivo,
      descripcion:    modal.descripcion,
      estado:         "PENDIENTE",
      fechaSolicitud: new Date().toISOString(),
    };

    guardarSolicitud(solicitud);
    fetch("http://localhost:4000/devoluciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(solicitud) }).catch(() => {});

    setModal(null);
    setExito(`Solicitud de ${modal.tipo === "ANULACION" ? "anulacion" : "devolucion"} enviada. El vendedor la revisara y recibiras una respuesta por correo.`);
    rerender((n) => n + 1);
    setTimeout(() => setExito(null), 7000);
  };

  const escalarReclamacion = async () => {
    if (!modalEscalacion || !modalEscalacion.reclamacion.trim()) return;
    setModalEscalacion((m) => m ? { ...m, enviando: true } : null);
    const s = modalEscalacion.solicitud;
    actualizarSolicitud(s.id, { estado: "RECLAMADA", reclamacion: modalEscalacion.reclamacion.trim(), fechaReclamacion: new Date().toISOString() });
    fetch("http://localhost:4000/devoluciones/escalar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solicitudId: s.id, facturaId: s.facturaId, pedidoId: s.pedidoId, emailComprador: s.emailComprador, monto: s.monto, tipo: s.tipo, motivo: s.motivo, motivoRechazo: s.motivoRechazo, reclamacion: modalEscalacion.reclamacion.trim() }) }).catch(() => {});
    setModalEscalacion(null);
    setExito("Reclamacion enviada al administrador. Revisara el caso de forma imparcial y notificara a ambas partes.");
    rerender((n) => n + 1);
    setTimeout(() => setExito(null), 8000);
  };

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";
  const labelCls = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Comprador</p>
            <h1 className="text-2xl font-black text-slate-900">Mis Facturas</h1>
          </div>
          <a href="/pago" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
            Nuevo pago
          </a>
        </div>

        {/* Banner exito */}
        {exito && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-sm text-indigo-800 font-medium">{exito}</p>
          </div>
        )}

        {facturas.length === 0 ? (
          <EmptyState
            icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            title="Sin facturas aun"
            desc="Realiza un pago exitoso para que aparezca tu primer comprobante aqui."
          />
        ) : (
          <div className="space-y-4">
            {facturas.map((f) => {
              const solicitud = obtenerSolicitudPorFactura(f.id);
              return (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                  {/* Cabecera */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <svg className="w-4.5 h-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-slate-900">{f.id}</p>
                        <p className="text-xs text-slate-400">{new Date(f.fecha).toLocaleString("es-CO")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_FACTURA[f.estadoFactura]}`}>{f.estadoFactura}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_ESTADO[f.estado]}`}>{f.estado}</span>
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {[
                        { label: "Pedido",  val: f.pedidoId },
                        { label: "Metodo",  val: f.metodoPago },
                        { label: "Total",   val: `$${f.monto.toLocaleString("es-CO")} COP`, bold: true },
                        { label: "Correo",  val: f.clienteEmail || "—" },
                      ].map(({ label, val, bold }) => (
                        <div key={label}>
                          <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-0.5">{label}</p>
                          <p className={`text-sm ${bold ? "font-bold text-slate-900" : "text-slate-700"} truncate`}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Estado solicitud */}
                    {solicitud && (
                      <div className={`mb-4 rounded-xl border p-4 ${
                        solicitud.estado === "PENDIENTE"      ? "bg-amber-50 border-amber-200" :
                        solicitud.estado === "APROBADA"       ? "bg-emerald-50 border-emerald-200" :
                        solicitud.estado === "RECLAMADA"      ? "bg-violet-50 border-violet-200" :
                        solicitud.estado === "RESUELTA_ADMIN" ? "bg-indigo-50 border-indigo-200" :
                                                                "bg-rose-50 border-rose-200"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                            Solicitud de {solicitud.tipo === "ANULACION" ? "Anulacion" : "Devolucion"}
                          </p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_SOLICITUD[solicitud.estado]}`}>
                            {solicitud.estado === "RESUELTA_ADMIN" ? "RESUELTA (ADMIN)" : solicitud.estado}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600"><span className="font-semibold">Motivo:</span> {solicitud.motivo}</p>
                        {solicitud.descripcion && <p className="text-xs text-slate-500 mt-0.5">{solicitud.descripcion}</p>}

                        {solicitud.estado === "PENDIENTE" && (
                          <p className="text-xs text-amber-700 mt-2 font-medium">En revision por el vendedor. Recibiras respuesta por correo.</p>
                        )}
                        {solicitud.estado === "RECHAZADA" && solicitud.motivoRechazo && (
                          <div className="mt-2 pt-2 border-t border-rose-200">
                            <p className="text-xs font-bold text-rose-700 mb-0.5">Rechazada por el vendedor:</p>
                            <p className="text-xs text-rose-800">{solicitud.motivoRechazo}</p>
                            {solicitud.detalleRechazo && <p className="text-xs text-rose-700 mt-0.5 italic">{solicitud.detalleRechazo}</p>}
                            <p className="text-xs text-rose-600 mt-1.5 font-medium">Si no estas de acuerdo, puedes escalar al administrador.</p>
                          </div>
                        )}
                        {solicitud.estado === "APROBADA" && (
                          <div className="mt-2 pt-2 border-t border-emerald-200">
                            <p className="text-xs text-emerald-700 font-medium">Solicitud aprobada. El reembolso sera procesado en 3 a 5 dias habiles.</p>
                            {solicitud.reembolsoId && (
                              <p className="text-xs text-emerald-600 font-mono mt-0.5">Ref. reembolso: {solicitud.reembolsoId}</p>
                            )}
                          </div>
                        )}
                        {solicitud.estado === "RECLAMADA" && (
                          <div className="mt-2 pt-2 border-t border-violet-200">
                            <p className="text-xs text-violet-800 font-medium">Reclamacion enviada al administrador. Esperando decision final.</p>
                            {solicitud.reclamacion && <p className="text-xs text-violet-600 mt-0.5 italic">&quot;{solicitud.reclamacion}&quot;</p>}
                          </div>
                        )}
                        {solicitud.estado === "RESUELTA_ADMIN" && solicitud.adminDecision && (
                          <div className="mt-2 pt-2 border-t border-indigo-200">
                            <p className="text-xs font-bold text-indigo-700">Decision final: {solicitud.adminDecision === "APROBADA" ? "A favor del comprador" : "A favor del vendedor"}</p>
                            {solicitud.adminMotivo && <p className="text-xs text-indigo-800 mt-0.5">{solicitud.adminMotivo}</p>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => generarFacturaPDF(f)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                        Descargar PDF
                      </button>
                      {f.estadoFactura === "VIGENTE" && !solicitud && (
                        <button onClick={() => abrirModal(f)} className="px-4 py-2 text-xs font-bold border border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50 transition">
                          Solicitar anulacion / devolucion
                        </button>
                      )}
                      {solicitud?.estado === "RECHAZADA" && (
                        <button onClick={() => setModalEscalacion({ solicitud, reclamacion: "", enviando: false })} className="px-4 py-2 text-xs font-bold border border-violet-300 text-violet-700 rounded-xl hover:bg-violet-50 transition">
                          Escalar al administrador
                        </button>
                      )}
                      {/* HU08: Descargar Nota de Crédito cuando la solicitud fue aprobada */}
                      {solicitud?.estado === "APROBADA" && solicitud.reembolsoId && (
                        <button
                          onClick={() => generarNotaCreditoPDF(
                            solicitud.facturaId,
                            solicitud.reembolsoId!,
                            solicitud.monto,
                            solicitud.motivo,
                            solicitud.emailComprador,
                            solicitud.tipo,
                            solicitud.fechaResolucion || new Date().toISOString(),
                          )}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                          </svg>
                          Nota de Crédito PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ESCALACION ─── */}
      {modalEscalacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-black text-slate-900 mb-1">Escalar al administrador</h2>
            <p className="text-xs text-slate-500 mb-5">El administrador revisara el caso de forma imparcial y tomara una decision final vinculante.</p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-4">
              <p className="text-xs font-bold text-rose-700 uppercase mb-1">Razon de rechazo del vendedor</p>
              <p className="text-sm text-rose-800">{modalEscalacion.solicitud.motivoRechazo}</p>
              {modalEscalacion.solicitud.detalleRechazo && <p className="text-xs text-rose-600 mt-0.5 italic">{modalEscalacion.solicitud.detalleRechazo}</p>}
            </div>
            <div className="mb-5">
              <label className={labelCls}>Tu argumento *</label>
              <p className="text-xs text-slate-400 mb-2">Seras mas convincente con evidencia concreta y especifica.</p>
              <textarea value={modalEscalacion.reclamacion} onChange={(e) => setModalEscalacion((m) => m ? { ...m, reclamacion: e.target.value } : null)} placeholder="Ej: El producto llego danado, tengo fotos como evidencia..." rows={4} className={inputCls + " resize-none"} />
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-5">
              <p className="text-xs text-violet-800">Si el administrador determina que tu reclamacion no tiene fundamento, quedara cerrada definitivamente.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalEscalacion(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={escalarReclamacion} disabled={!modalEscalacion.reclamacion.trim() || modalEscalacion.enviando} className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition disabled:opacity-50">
                {modalEscalacion.enviando ? "Enviando..." : "Escalar reclamacion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SOLICITUD ─── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-black text-slate-900 mb-1">Solicitar anulacion / devolucion</h2>
            <p className="text-xs text-slate-500 mb-5">
              Factura <span className="font-mono font-bold text-slate-700">{modal.factura.id}</span> · ${modal.factura.monto.toLocaleString("es-CO")} COP
            </p>

            <div className="mb-5">
              <label className={labelCls}>Tipo de solicitud</label>
              <div className="grid grid-cols-2 gap-2">
                {(["ANULACION", "DEVOLUCION"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setModal((m) => m ? { ...m, tipo: t, motivo: "" } : null)}
                    className={`p-3.5 rounded-xl border-2 text-sm font-semibold transition text-left ${modal.tipo === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                    <span className="block text-lg mb-0.5">{t === "ANULACION" ? "🚫" : "↩️"}</span>
                    {t === "ANULACION" ? "Anulacion" : "Devolucion"}
                    <span className="block text-xs font-normal opacity-70 mt-0.5">{t === "ANULACION" ? "Cancelar antes de recibir" : "Devolver producto recibido"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className={labelCls}>Motivo *</label>
              <select value={modal.motivo} onChange={(e) => setModal((m) => m ? { ...m, motivo: e.target.value } : null)} className={inputCls}>
                <option value="" className="text-slate-900">Selecciona un motivo...</option>
                {motivosActuales.map((m) => <option key={m} value={m} className="text-slate-900">{m}</option>)}
              </select>
            </div>

            <div className="mb-5">
              <label className={labelCls}>Descripcion adicional <span className="font-normal text-slate-400 normal-case">(opcional)</span></label>
              <textarea value={modal.descripcion} onChange={(e) => setModal((m) => m ? { ...m, descripcion: e.target.value } : null)} placeholder="Describe con mas detalle tu situacion..." rows={3} className={inputCls + " resize-none"} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <p className="text-xs text-amber-800">El vendedor revisara tu solicitud. Proceso: hasta 48 horas habiles.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={enviarSolicitud} disabled={!modal.motivo || modal.enviando} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
                {modal.enviando ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={icon}/></svg>
      </div>
      <h2 className="font-bold text-slate-700 mb-1">{title}</h2>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}
