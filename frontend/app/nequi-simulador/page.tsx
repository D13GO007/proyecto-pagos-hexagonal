"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function NequiContenido() {
  const searchParams = useSearchParams();
  const ref      = searchParams.get("ref")      || "NEQUI-0000";
  const monto    = parseInt(searchParams.get("monto")    || "0");
  const telefono = searchParams.get("telefono") || "300*******";

  const [paso,       setPaso]       = useState<1 | 2 | 3>(1);
  const [procesando, setProcesando] = useState(false);
  const [aprobado,   setAprobado]   = useState<boolean | null>(null);

  const enviarNotificacion = () => {
    setProcesando(true);
    setTimeout(() => {
      setProcesando(false);
      setPaso(2);
    }, 2000);
  };

  const responder = (aprueba: boolean) => {
    setProcesando(true);
    setTimeout(() => {
      setProcesando(false);
      setAprobado(aprueba);
      setPaso(3);
      if (aprueba) {
        localStorage.setItem(
          "pse_pago_resultado",
          JSON.stringify({ aprobado: true, ref, ts: Date.now() })
        );
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: "#f0edf7" }}>
      <div className="w-full max-w-sm">

        {/* Header Nequi */}
        <div className="rounded-t-2xl p-5 flex items-center justify-between" style={{ backgroundColor: "#1b113e" }}>
          <div>
            <p className="text-xs text-purple-300 uppercase tracking-widest mb-1">Solicitud de pago</p>
            <p className="text-white font-bold text-lg">E-Commerce</p>
          </div>
          <div className="bg-white rounded-xl px-3 py-1">
            <span className="font-black text-base tracking-wider" style={{ color: "#1b113e" }}>NEQUI</span>
          </div>
        </div>

        {/* Monto destacado */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: "#2d1f5e" }}>
          <span className="text-purple-300 text-sm font-medium">Total a pagar</span>
          <span className="text-white font-black text-2xl">${monto.toLocaleString("es-CO")}</span>
        </div>

        {/* Cuerpo */}
        <div className="bg-white rounded-b-2xl shadow-lg overflow-hidden">

          {/* PASO 1: Enviar notificación */}
          {paso === 1 && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-purple-50 border border-purple-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: "#1b113e" }}>
                  📱
                </div>
                <div>
                  <p className="text-xs text-gray-500">Número registrado</p>
                  <p className="font-bold text-gray-900 font-mono">{telefono}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6 text-center">
                Te enviaremos una notificación a tu app Nequi para que apruebes este pago.
              </p>

              <div className="space-y-2 text-sm mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Referencia</span>
                  <span className="font-mono text-xs text-gray-700">{ref}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Valor</span>
                  <span className="font-bold text-gray-900">${monto.toLocaleString("es-CO")} COP</span>
                </div>
              </div>

              <button
                onClick={enviarNotificacion}
                disabled={procesando}
                className="w-full py-3 rounded-xl font-bold text-white transition-opacity disabled:opacity-60 text-sm"
                style={{ backgroundColor: "#1b113e" }}
              >
                {procesando ? "Enviando notificación..." : "Enviar notificación a mi app"}
              </button>
            </div>
          )}

          {/* PASO 2: Notificación recibida */}
          {paso === 2 && !procesando && (
            <div className="p-6">
              {/* Simulación de push notification */}
              <div className="mb-5 rounded-2xl border border-purple-200 overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: "#1b113e" }}>
                  <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
                    <span className="text-xs font-black" style={{ color: "#1b113e" }}>N</span>
                  </div>
                  <span className="text-white text-xs font-semibold">NEQUI</span>
                  <span className="text-purple-300 text-xs ml-auto">ahora</span>
                </div>
                <div className="bg-purple-50 px-4 py-3">
                  <p className="font-bold text-gray-900 text-sm">¿Apruebas este pago?</p>
                  <p className="text-gray-600 text-xs mt-1">
                    <strong>E-Commerce</strong> te solicita{" "}
                    <strong>${monto.toLocaleString("es-CO")} COP</strong>
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mb-5">
                Confirma o rechaza la solicitud de pago:
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => responder(false)}
                  className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition text-sm"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => responder(true)}
                  className="flex-1 py-3 rounded-xl font-bold text-white transition text-sm"
                  style={{ backgroundColor: "#1b113e" }}
                >
                  ✓ Aprobar
                </button>
              </div>
            </div>
          )}

          {/* Procesando */}
          {procesando && (
            <div className="flex flex-col items-center py-12 px-6">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin mb-4" />
              <p className="font-semibold text-gray-700 text-sm">Procesando...</p>
            </div>
          )}

          {/* PASO 3: Resultado */}
          {paso === 3 && aprobado && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#ede9f7" }}>
                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="#1b113e">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-black mb-1" style={{ color: "#1b113e" }}>¡Pago aprobado!</h3>
              <p className="text-sm text-gray-500 mb-5">Tu pago fue procesado correctamente por Nequi.</p>
              <div className="rounded-xl p-4 text-left text-sm space-y-2" style={{ backgroundColor: "#f0edf7" }}>
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado</span>
                  <span className="font-bold uppercase" style={{ color: "#1b113e" }}>Aprobado</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Referencia</span>
                  <span className="font-mono text-xs text-gray-700">{ref}</span>
                </div>
                <div className="flex justify-between border-t border-purple-200 pt-2">
                  <span className="text-gray-600 font-medium">Valor debitado</span>
                  <span className="font-bold">${monto.toLocaleString("es-CO")} COP</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-5">Puedes cerrar esta ventana</p>
            </div>
          )}

          {paso === 3 && aprobado === false && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-9 h-9 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-red-700 mb-1">Pago rechazado</h3>
              <p className="text-sm text-gray-500">Vuelve al comercio para intentarlo de nuevo.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-400">
          <span>🔒 Conexión segura</span>
          <span>·</span>
          <span>Nequi by Bancolombia</span>
        </div>
      </div>
    </div>
  );
}

export default function NequiSimuladorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f0edf7" }}>
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin" />
      </div>
    }>
      <NequiContenido />
    </Suspense>
  );
}
