"use client";

import { useState, useEffect } from "react";

interface ReglaDescuento {
  id: string;
  tipo: "producto" | "categoria";
  objetivo: string;
  valorDescuento: number;
  tipoValor: "porcentaje" | "monto";
  fechaInicio: string;
  fechaFin: string;
  admin: string;
  creadoEn: string;
  activa: boolean;
}

const PRODUCTOS  = ["Laptop Pro X", "Teclado Mecanico", "Monitor 4K", "Mouse Inalambrico", "Audifonos BT"];
const CATEGORIAS = ["Electronica", "Accesorios", "Perifericos", "Software", "Servicios"];
const ADMINS     = ["Diego Rodriguez", "Ana Martinez", "Carlos Lopez"];
const KEY        = "reglas_descuento";

function cargar(): ReglaDescuento[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function guardar(r: ReglaDescuento[]) { localStorage.setItem(KEY, JSON.stringify(r)); }

export default function ConfigDescuentos() {
  const [reglas,      setReglas]      = useState<ReglaDescuento[]>([]);
  const [tipo,        setTipo]        = useState<"producto" | "categoria">("producto");
  const [objetivo,    setObjetivo]    = useState("");
  const [valor,       setValor]       = useState("");
  const [tipoValor,   setTipoValor]   = useState<"porcentaje" | "monto">("porcentaje");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin,    setFechaFin]    = useState("");
  const [admin,       setAdmin]       = useState(ADMINS[0]);
  const [guardado,    setGuardado]    = useState(false);

  useEffect(() => { setReglas(cargar()); }, []);

  const opciones = tipo === "producto" ? PRODUCTOS : CATEGORIAS;

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objetivo || !valor || !fechaInicio || !fechaFin) return;
    const nueva: ReglaDescuento = {
      id: `DESC-${Date.now()}`, tipo, objetivo,
      valorDescuento: parseFloat(valor), tipoValor, fechaInicio, fechaFin, admin,
      creadoEn: new Date().toISOString(), activa: true,
    };
    const actualizadas = [nueva, ...reglas];
    guardar(actualizadas);
    setReglas(actualizadas);
    setObjetivo(""); setValor(""); setFechaInicio(""); setFechaFin("");
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const toggleActiva = (id: string) => {
    const actualizadas = reglas.map((r) => r.id === id ? { ...r, activa: !r.activa } : r);
    guardar(actualizadas); setReglas(actualizadas);
  };

  const eliminar = (id: string) => {
    const actualizadas = reglas.filter((r) => r.id !== id);
    guardar(actualizadas); setReglas(actualizadas);
  };

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Vendedor</p>
            <h1 className="text-2xl font-black text-slate-900">Configuracion de Descuentos</h1>
          </div>
          <span className="text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">{reglas.length} regla(s)</span>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-6">Nueva Regla de Descuento</h2>
          <form onSubmit={agregar} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className={labelCls}>Aplicar a</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["producto", "categoria"] as const).map((t) => (
                    <label key={t} className={`flex items-center justify-center gap-2 border-2 rounded-xl p-3 cursor-pointer text-sm font-semibold transition ${tipo === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                      <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => { setTipo(t); setObjetivo(""); }} className="sr-only" />
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {t === "producto"
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>}
                      </svg>
                      {t === "producto" ? "Producto" : "Categoria"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>{tipo === "producto" ? "Producto" : "Categoria"}</label>
                <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} required className={inputCls}>
                  <option value="" className="text-slate-900">Selecciona...</option>
                  {opciones.map((o) => <option key={o} value={o} className="text-slate-900">{o}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Tipo de descuento</label>
                <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-2 min-w-0">
                  <select value={tipoValor} onChange={(e) => setTipoValor(e.target.value as "porcentaje" | "monto")} className={inputCls + " w-full"}>
                    <option value="porcentaje" className="text-slate-900">% Porcentaje</option>
                    <option value="monto" className="text-slate-900">$ Monto fijo</option>
                  </select>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} type="number" min="0" required placeholder={tipoValor === "porcentaje" ? "10" : "5000"} className={inputCls + " min-w-0 w-full"} />
                </div>
                {tipoValor === "porcentaje" && parseFloat(valor) > 100 && (
                  <p className="text-xs text-rose-600 mt-1">El porcentaje no puede superar el 100%</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Administrador responsable</label>
                <select value={admin} onChange={(e) => setAdmin(e.target.value)} className={inputCls}>
                  {ADMINS.map((a) => <option key={a} value={a} className="text-slate-900">{a}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Fecha y hora de inicio</label>
                <input type="datetime-local" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Fecha y hora de fin</label>
                <input type="datetime-local" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required min={fechaInicio} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-sm shadow-sm">
                Guardar regla
              </button>
              {guardado && (
                <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Regla guardada
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Historial de reglas</h2>
          </div>

          {reglas.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/></svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">No hay reglas configuradas aun.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reglas.map((r) => {
                const ahora   = new Date();
                const inicio  = new Date(r.fechaInicio);
                const fin     = new Date(r.fechaFin);
                const vigente = r.activa && ahora >= inicio && ahora <= fin;
                const expirada= ahora > fin;
                return (
                  <div key={r.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-slate-900 text-sm">{r.objetivo}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold">{r.tipo === "producto" ? "Producto" : "Categoria"}</span>
                        {vigente ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">Vigente</span>
                        ) : expirada ? (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold">Expirada</span>
                        ) : r.activa ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">Programada</span>
                        ) : (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold">Inactiva</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">
                        Descuento: <strong className="text-slate-900">{r.tipoValor === "porcentaje" ? `${r.valorDescuento}%` : `$${r.valorDescuento.toLocaleString("es-CO")}`}</strong>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(r.fechaInicio).toLocaleString("es-CO")} → {new Date(r.fechaFin).toLocaleString("es-CO")}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Por: <span className="text-slate-500 font-medium">{r.admin}</span> · {new Date(r.creadoEn).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => toggleActiva(r.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${r.activa ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
                        {r.activa ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => eliminar(r.id)} className="px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition">
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
