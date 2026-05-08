"use client";

import { useState, useEffect } from "react";
import { obtenerTransacciones, obtenerFacturas, type Transaccion } from "@/lib/transacciones";
import { generarFacturaPDF } from "@/lib/generarFacturaPDF";

const BADGE: Record<string, string> = {
  APROBADO:  "bg-emerald-100 text-emerald-700",
  PENDIENTE: "bg-amber-100 text-amber-700",
  RECHAZADO: "bg-rose-100 text-rose-700",
};

export default function HistorialVendedor() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [filtroId,     setFiltroId]     = useState("");
  const [filtroMonto,  setFiltroMonto]  = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha,  setFiltroFecha]  = useState("");

  useEffect(() => { setTransacciones(obtenerTransacciones()); }, []);

  const filtradas = transacciones.filter((t) => {
    if (filtroId     && !t.id.toLowerCase().includes(filtroId.toLowerCase())) return false;
    if (filtroMonto  && !t.monto.toString().includes(filtroMonto))             return false;
    if (filtroEstado && t.estado !== filtroEstado)                             return false;
    if (filtroFecha  && !t.fecha.startsWith(filtroFecha))                     return false;
    return true;
  });

  const descargarComprobante = (t: Transaccion) => {
    const f = obtenerFacturas().find((x) => x.id === t.id);
    if (f) { generarFacturaPDF(f); return; }
    alert("No se encontro la factura para esta transaccion.");
  };

  const montoTotal = transacciones.filter((t) => t.estado === "APROBADO").reduce((s, t) => s + t.monto, 0);

  const inputCls = "w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Vendedor</p>
            <h1 className="text-2xl font-black text-slate-900">Historial de Transacciones</h1>
          </div>
          <span className="text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">{filtradas.length} resultado(s)</span>
        </div>

        {/* Metricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total",      val: transacciones.length,                                               color: "text-slate-900",   bg: "bg-slate-100" },
            { label: "Aprobadas",  val: transacciones.filter((t) => t.estado === "APROBADO").length,        color: "text-emerald-700", bg: "bg-emerald-100" },
            { label: "Pendientes", val: transacciones.filter((t) => t.estado === "PENDIENTE").length,       color: "text-amber-700",   bg: "bg-amber-100" },
            { label: "Ingresos",   val: `$${montoTotal.toLocaleString("es-CO")}`,                           color: "text-indigo-700",  bg: "bg-indigo-100" },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <div className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
              </div>
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Filtros</h2>
            <button onClick={() => { setFiltroId(""); setFiltroMonto(""); setFiltroEstado(""); setFiltroFecha(""); }} className="text-xs text-indigo-600 font-semibold hover:underline">Limpiar</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="block text-xs text-slate-500 mb-1 font-medium">ID Transaccion</label><input value={filtroId} onChange={(e) => setFiltroId(e.target.value)} placeholder="TXN-..." className={inputCls} /></div>
            <div><label className="block text-xs text-slate-500 mb-1 font-medium">Monto</label><input value={filtroMonto} onChange={(e) => setFiltroMonto(e.target.value)} placeholder="335000" className={inputCls} /></div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-medium">Estado</label>
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={inputCls}>
                <option value="" className="text-slate-900">Todos</option>
                <option value="APROBADO" className="text-slate-900">Aprobado</option>
                <option value="PENDIENTE" className="text-slate-900">Pendiente</option>
                <option value="RECHAZADO" className="text-slate-900">Rechazado</option>
              </select>
            </div>
            <div><label className="block text-xs text-slate-500 mb-1 font-medium">Fecha</label><input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className={inputCls} /></div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {["ID Transaccion", "Fecha / Hora", "Pedido", "Metodo", "Monto", "Estado", "Comprobante"].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-slate-500 text-sm">
                      {transacciones.length === 0
                        ? "No hay transacciones aun. Realiza un pago para verlo aqui."
                        : "Ninguna transaccion coincide con los filtros."}
                    </td>
                  </tr>
                ) : filtradas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{t.id}</td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                      {new Date(t.fecha).toLocaleDateString("es-CO")}
                      <span className="block text-xs text-slate-400">{new Date(t.fecha).toLocaleTimeString("es-CO")}</span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{t.pedidoId}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">{t.metodoPago}</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">${t.monto.toLocaleString("es-CO")}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE[t.estado]}`}>{t.estado}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => descargarComprobante(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
