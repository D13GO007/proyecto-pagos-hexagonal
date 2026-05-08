"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const BANCOS: Record<string, { nombre: string; color: string; sigla: string }> = {
  "1001": { nombre: "Banco de Bogotá",  color: "#003087", sigla: "BB" },
  "1007": { nombre: "Bancolombia",       color: "#FBBF24", sigla: "BC" },
  "1051": { nombre: "Davivienda",        color: "#DC2626", sigla: "DV" },
};

function SimuladorContenido() {
  const searchParams = useSearchParams();
  const ref    = searchParams.get("ref")   || "PSE-0000";
  const monto  = parseInt(searchParams.get("monto") || "0");
  const codigo = searchParams.get("banco") || "1007";
  const banco  = BANCOS[codigo] || { nombre: "Banco", color: "#003087", sigla: "B" };

  const [paso,       setPaso]       = useState<1 | 2 | 3>(1);
  const [clave,      setClave]      = useState("");
  const [procesando, setProcesando] = useState(false);
  const [resultado,  setResultado]  = useState<"aprobado" | "rechazado" | null>(null);

  const autenticar = (e: React.FormEvent) => {
    e.preventDefault();
    if (clave.length < 4) return;
    setProcesando(true);
    setTimeout(() => { setProcesando(false); setPaso(2); }, 1500);
  };

  const procesarPago = (aprobado: boolean) => {
    setProcesando(true);
    setTimeout(() => {
      setProcesando(false);
      setResultado(aprobado ? "aprobado" : "rechazado");
      setPaso(3);
      if (aprobado) {
        localStorage.setItem("pse_pago_resultado", JSON.stringify({ aprobado: true, ref, ts: Date.now() }));
      }
    }, 2000);
  };

  const colorBanco = banco.color;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="bg-white rounded-t-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
              style={{ backgroundColor: colorBanco }}
            >
              {banco.sigla}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Portal de pagos</p>
              <p className="font-bold text-gray-900 text-sm">{banco.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-blue-500" />
            <span className="text-blue-600 font-black text-xl leading-none">pse</span>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-gray-50 border-x border-gray-200 px-6 pt-4 pb-2">
          <div className="flex items-center justify-center gap-2">
            {([1, 2, 3] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    paso >= s ? "text-white" : "bg-gray-200 text-gray-400"
                  }`}
                  style={paso >= s ? { backgroundColor: colorBanco } : {}}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className="w-10 h-0.5 transition-all"
                    style={{ backgroundColor: paso > s ? colorBanco : "#e5e7eb" }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs mt-2 px-1">
            {["Autenticación", "Confirmar", "Resultado"].map((label, i) => (
              <span
                key={label}
                className={`font-medium transition-all ${paso >= i + 1 ? "text-blue-600" : "text-gray-400"}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6 shadow-sm">

          {/* Transaction summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">
              Detalle de la transacción
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Comercio</span>
                <span className="font-semibold text-gray-900">E-Commerce</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Referencia</span>
                <span className="font-mono text-xs text-gray-700">{ref}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200 mt-2">
                <span className="text-gray-600 font-medium">Total a pagar</span>
                <span className="font-bold text-gray-900">${monto.toLocaleString("es-CO")} COP</span>
              </div>
            </div>
          </div>

          {/* PASO 1: Autenticación */}
          {paso === 1 && (
            <form onSubmit={autenticar} className="space-y-4">
              <p className="text-sm font-semibold text-gray-800">
                Ingresa tu clave de Internet Banking
              </p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Usuario</label>
                <input
                  readOnly
                  value="usuario****23"
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Clave</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ambiente de pruebas — ingresa cualquier clave de 4+ caracteres
                </p>
              </div>
              <button
                type="submit"
                disabled={procesando}
                className="w-full py-3 rounded-lg font-bold text-white text-sm transition-opacity disabled:opacity-60"
                style={{ backgroundColor: colorBanco }}
              >
                {procesando ? "Verificando..." : "Continuar →"}
              </button>
            </form>
          )}

          {/* PASO 2: Confirmar */}
          {paso === 2 && !procesando && (
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-4">
                ¿Confirmas el siguiente pago?
              </p>
              <div className="divide-y divide-gray-100 mb-6 text-sm">
                {[
                  ["Beneficiario",   "E-Commerce"],
                  ["Banco destino",  "Bancolombia S.A."],
                  ["Tipo de cuenta", "Corriente empresarial"],
                  ["No. cuenta",     "●●●●●● 4821"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between py-3">
                  <span className="text-gray-600 font-semibold">Total a debitar</span>
                  <span className="font-bold text-lg text-gray-900">
                    ${monto.toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => procesarPago(false)}
                  className="flex-1 py-3 rounded-lg font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => procesarPago(true)}
                  className="flex-1 py-3 rounded-lg font-bold text-white transition text-sm"
                  style={{ backgroundColor: colorBanco }}
                >
                  Confirmar pago
                </button>
              </div>
            </div>
          )}

          {/* Procesando */}
          {procesando && (
            <div className="flex flex-col items-center py-10">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="font-semibold text-gray-700">Procesando transacción...</p>
              <p className="text-xs text-gray-400 mt-1">No cierres esta ventana</p>
            </div>
          )}

          {/* PASO 3: Aprobado */}
          {paso === 3 && resultado === "aprobado" && (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-1">¡Pago exitoso!</h3>
              <p className="text-sm text-gray-500 mb-5">
                Tu transacción fue procesada correctamente.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado</span>
                  <span className="font-bold text-green-700 uppercase">Aprobada</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Referencia</span>
                  <span className="font-mono text-xs text-gray-700">{ref}</span>
                </div>
                <div className="flex justify-between border-t border-green-200 pt-2">
                  <span className="text-gray-600 font-medium">Valor debitado</span>
                  <span className="font-bold">${monto.toLocaleString("es-CO")} COP</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-5">Puedes cerrar esta ventana</p>
            </div>
          )}

          {/* PASO 3: Rechazado */}
          {paso === 3 && resultado === "rechazado" && (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-1">Transacción cancelada</h3>
              <p className="text-sm text-gray-500">
                Cerraste el proceso de pago. Vuelve al comercio para intentarlo de nuevo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>🔒 Conexión SSL segura</span>
          <span>·</span>
          <span>ACH Colombia S.A.</span>
          <span>·</span>
          <span>PSE®</span>
        </div>
      </div>
    </div>
  );
}

export default function PseSimuladorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <SimuladorContenido />
    </Suspense>
  );
}
