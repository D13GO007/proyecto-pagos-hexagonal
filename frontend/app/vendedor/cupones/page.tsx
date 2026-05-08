"use client";

// HU13: Vendedor crea cupones con fecha de expiración y límite de usos.
// Los cupones se sincronizan con el backend (POST /cupones) y se guardan
// en localStorage para que el checkout los valide offline también.

import { useState, useEffect } from "react";

interface Cupon {
  codigo: string;
  descripcion: string;
  tipoDescuento: "porcentaje" | "monto";
  valorDescuento: number;
  montoMinimo: number;
  maxUsos: number;
  usosActuales: number;
  fechaExpiracion: string;
  activo: boolean;
  vendedorId: string;
  creadoEn: string;
}

const KEY_LOCAL = "cupones_vendedor";
const API = "http://localhost:4000/cupones";

function cargarLocal(): Cupon[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY_LOCAL) || "[]"); } catch { return []; }
}
function guardarLocal(lista: Cupon[]) {
  localStorage.setItem(KEY_LOCAL, JSON.stringify(lista));
}

function estadoCupon(c: Cupon): { label: string; cls: string } {
  if (!c.activo) return { label: "Inactivo", cls: "bg-slate-100 text-slate-500" };
  if (new Date(c.fechaExpiracion) < new Date()) return { label: "Expirado", cls: "bg-red-100 text-red-600" };
  if (c.usosActuales >= c.maxUsos) return { label: "Agotado", cls: "bg-orange-100 text-orange-700" };
  return { label: "Activo", cls: "bg-emerald-100 text-emerald-700" };
}

export default function CuponesVendedor() {
  const [cupones,      setCupones]      = useState<Cupon[]>([]);
  const [codigo,       setCodigo]       = useState("");
  const [descripcion,  setDescripcion]  = useState("");
  const [tipo,         setTipo]         = useState<"porcentaje" | "monto">("porcentaje");
  const [valor,        setValor]        = useState("");
  const [montoMin,     setMontoMin]     = useState("");
  const [maxUsos,      setMaxUsos]      = useState("");
  const [fechaExp,     setFechaExp]     = useState("");
  const [guardando,    setGuardando]    = useState(false);
  const [exito,        setExito]        = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    // Cargar cupones locales primero (offline-first)
    setCupones(cargarLocal());
    // Luego intentar sincronizar con backend
    fetch(API)
      .then((r) => r.json())
      .then((data: Cupon[]) => {
        if (Array.isArray(data)) {
          setCupones(data);
          guardarLocal(data);
        }
      })
      .catch(() => { /* backend offline → usamos localStorage */ });
  }, []);

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    setGuardando(true);

    const dto = {
      codigo: codigo.trim().toUpperCase(),
      descripcion,
      tipoDescuento: tipo,
      valorDescuento: parseFloat(valor),
      montoMinimo: parseFloat(montoMin) || 0,
      maxUsos: parseInt(maxUsos),
      fechaExpiracion: new Date(fechaExp).toISOString(),
      vendedorId: "vendedor-001",
    };

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al crear el cupón.");
        setGuardando(false);
        return;
      }
      const nuevos = [data as Cupon, ...cupones];
      setCupones(nuevos);
      guardarLocal(nuevos);
      setExito(`Cupón "${data.codigo}" creado exitosamente.`);
      setCodigo(""); setDescripcion(""); setValor(""); setMontoMin(""); setMaxUsos(""); setFechaExp("");
    } catch {
      // Backend offline: guardar solo en localStorage
      const nuevo: Cupon = {
        ...dto,
        usosActuales: 0,
        activo: true,
        creadoEn: new Date().toISOString(),
      } as Cupon;
      const nuevos = [nuevo, ...cupones];
      setCupones(nuevos);
      guardarLocal(nuevos);
      setExito(`Cupón "${dto.codigo}" guardado localmente (backend offline).`);
      setCodigo(""); setDescripcion(""); setValor(""); setMontoMin(""); setMaxUsos(""); setFechaExp("");
    } finally {
      setGuardando(false);
      setTimeout(() => setExito(null), 4000);
    }
  };

  const toggleActivo = (codigo: string) => {
    const actualizados = cupones.map((c) =>
      c.codigo === codigo ? { ...c, activo: !c.activo } : c
    );
    setCupones(actualizados);
    guardarLocal(actualizados);
  };

  const activos   = cupones.filter((c) => c.activo && new Date(c.fechaExpiracion) >= new Date() && c.usosActuales < c.maxUsos).length;
  const expirados = cupones.filter((c) => new Date(c.fechaExpiracion) < new Date()).length;
  const agotados  = cupones.filter((c) => c.usosActuales >= c.maxUsos).length;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Vendedor</p>
            <h1 className="text-2xl font-black text-slate-900">Gestión de Cupones</h1>
            <p className="text-sm text-slate-500 mt-0.5">Crea y administra cupones de descuento para tus clientes</p>
          </div>
          {/* Métricas rápidas */}
          <div className="flex gap-3">
            {[
              { label: "Activos",   val: activos,   cls: "text-emerald-600" },
              { label: "Expirados", val: expirados, cls: "text-red-500" },
              { label: "Agotados",  val: agotados,  cls: "text-orange-600" },
            ].map((m) => (
              <div key={m.label} className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center shadow-sm">
                <p className={`text-xl font-black ${m.cls}`}>{m.val}</p>
                <p className="text-xs text-slate-500 font-medium">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cupones de prueba */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3.5 mb-6 flex items-start gap-3">
          <svg className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-indigo-800">
            <strong>Cupones de prueba precargados:</strong>{" "}
            <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">BIENVENIDO10</code> (10% off, mín $50k),{" "}
            <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">DESC20MIL</code> ($20k off, mín $100k),{" "}
            <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-xs font-mono">VERANO30</code> (expirado — para probar HU15)
          </p>
        </div>

        {/* Formulario de creación */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-6">Nuevo Cupón</h2>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
              <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
              {error}
            </div>
          )}
          {exito && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {exito}
            </div>
          )}

          <form onSubmit={crear} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className={labelCls}>Código del cupón</label>
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="PROMO2026"
                  required
                  className={inputCls}
                  style={{ textTransform: "uppercase" }}
                />
                <p className="text-xs text-slate-400 mt-1">Se guarda en mayúsculas automáticamente.</p>
              </div>

              <div>
                <label className={labelCls}>Descripción</label>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: 10% para nuevos clientes"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Tipo de descuento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["porcentaje", "monto"] as const).map((t) => (
                    <label
                      key={t}
                      className={`flex items-center justify-center gap-2 border-2 rounded-xl p-3 cursor-pointer text-sm font-semibold transition ${
                        tipo === t
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                      {t === "porcentaje" ? "% Porcentaje" : "$ Monto fijo"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Valor del descuento</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    {tipo === "porcentaje" ? "%" : "$"}
                  </span>
                  <input
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    type="number"
                    min="1"
                    max={tipo === "porcentaje" ? 100 : undefined}
                    required
                    placeholder={tipo === "porcentaje" ? "10" : "20000"}
                    className={inputCls + " pl-8"}
                  />
                </div>
                {tipo === "porcentaje" && parseFloat(valor) > 100 && (
                  <p className="text-xs text-rose-600 mt-1">El porcentaje no puede superar 100%</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Monto mínimo de compra (COP)</label>
                <input
                  value={montoMin}
                  onChange={(e) => setMontoMin(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="50000"
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">0 = sin monto mínimo (HU15)</p>
              </div>

              <div>
                <label className={labelCls}>Límite de usos totales</label>
                <input
                  value={maxUsos}
                  onChange={(e) => setMaxUsos(e.target.value)}
                  type="number"
                  min="1"
                  required
                  placeholder="100"
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Fecha y hora de expiración</label>
                <input
                  type="datetime-local"
                  value={fechaExp}
                  onChange={(e) => setFechaExp(e.target.value)}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={guardando}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-sm shadow-sm disabled:opacity-60"
              >
                {guardando ? "Creando..." : "Crear cupón"}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de cupones */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Cupones registrados</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{cupones.length} total</span>
          </div>

          {cupones.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/>
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">No hay cupones registrados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cupones.map((c) => {
                const { label, cls } = estadoCupon(c);
                const pctUso = c.maxUsos > 0 ? Math.round((c.usosActuales / c.maxUsos) * 100) : 0;
                return (
                  <div key={c.codigo} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <code className="font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg tracking-wider">
                          {c.codigo}
                        </code>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${cls}`}>{label}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold">
                          {c.tipoDescuento === "porcentaje" ? `${c.valorDescuento}%` : `$${c.valorDescuento.toLocaleString("es-CO")}`} off
                        </span>
                      </div>

                      {c.descripcion && (
                        <p className="text-xs text-slate-500 mb-2">{c.descripcion}</p>
                      )}

                      {/* Barra de uso */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pctUso >= 100 ? "bg-orange-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(pctUso, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                          {c.usosActuales}/{c.maxUsos} usos
                        </span>
                      </div>

                      <div className="flex gap-4 text-xs text-slate-400">
                        {c.montoMinimo > 0 && (
                          <span>Mín: ${c.montoMinimo.toLocaleString("es-CO")}</span>
                        )}
                        <span>Expira: {new Date(c.fechaExpiracion).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleActivo(c.codigo)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex-shrink-0 ${
                        c.activo
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {c.activo ? "Desactivar" : "Activar"}
                    </button>
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
