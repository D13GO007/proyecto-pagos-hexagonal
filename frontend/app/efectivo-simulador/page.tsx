"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const PUNTOS = {
  efecty: {
    nombre: "Efecty",
    bgHeader: "#FFC300",
    bgPage: "#FFFBEA",
    textColor: "#1a1a00",
    acento: "#E6A800",
    instrucciones: [
      "Dirígete a cualquier punto Efecty en Colombia.",
      "Presenta el código de referencia al cajero.",
      "Paga el valor exacto en efectivo.",
      "Conserva tu comprobante de pago.",
    ],
    redPuntos: "9.000+ puntos Efecty en todo el país",
  },
  baloto: {
    nombre: "Via Baloto",
    bgHeader: "#00A651",
    bgPage: "#F0FFF6",
    textColor: "#003d1f",
    acento: "#007A3D",
    instrucciones: [
      "Dirígete a cualquier punto Via Baloto autorizado.",
      "Muestra el código de referencia al cajero.",
      "Paga el monto exacto en efectivo.",
      "Guarda tu recibo como comprobante.",
    ],
    redPuntos: "13.000+ puntos Via Baloto en Colombia",
  },
} as const;

function BarcodeSimulado() {
  const barras = [3,1,2,1,3,2,1,2,1,3,1,2,2,1,3,1,2,1,3,2,1,2,3,1,2,1,2,3,1,2,1,3,2,1,2,1,3,2,1,1,3,2,1];
  return (
    <div className="flex items-end justify-center gap-[2px] h-14 my-3">
      {barras.map((ancho, i) => (
        <div
          key={i}
          style={{ width: ancho * 2, backgroundColor: i % 2 === 0 ? "#1a1a1a" : "transparent" }}
          className="h-full"
        />
      ))}
    </div>
  );
}

function EfectivoContenido() {
  const searchParams = useSearchParams();
  const ref   = searchParams.get("ref")   || "EFE-0000";
  const monto = parseInt(searchParams.get("monto") || "0");
  const punto = (searchParams.get("punto") || "efecty") as keyof typeof PUNTOS;
  const cfg   = PUNTOS[punto] ?? PUNTOS.efecty;

  const codigoRef = ref.replace(/\D/g, "").padEnd(12, "0").slice(0, 12)
    .replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");

  const [paso,       setPaso]       = useState<1 | 2>(1);
  const [procesando, setProcesando] = useState(false);

  const confirmarPago = () => {
    setProcesando(true);
    setTimeout(() => {
      localStorage.setItem(
        "pse_pago_resultado",
        JSON.stringify({ aprobado: true, ref, ts: Date.now() })
      );
      setProcesando(false);
      setPaso(2);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: cfg.bgPage }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="rounded-t-2xl px-5 py-4 flex items-center justify-between" style={{ backgroundColor: cfg.bgHeader }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70" style={{ color: cfg.textColor }}>
              Recibo de pago en efectivo
            </p>
            <p className="font-black text-xl" style={{ color: cfg.textColor }}>{cfg.nombre}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: cfg.textColor }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
        </div>

        {paso === 1 && (
          <>
            {/* Voucher */}
            <div className="bg-white border-x-2 border-dashed" style={{ borderColor: cfg.acento }}>

              {/* Comercio y monto */}
              <div className="px-5 pt-5 pb-3 border-b border-dashed border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Comercio</p>
                    <p className="font-bold text-gray-900">E-Commerce</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total a pagar</p>
                    <p className="font-black text-2xl text-gray-900">${monto.toLocaleString("es-CO")}</p>
                    <p className="text-xs text-gray-400">COP</p>
                  </div>
                </div>
              </div>

              {/* Código de referencia */}
              <div className="px-5 py-4 text-center border-b border-dashed border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Código de referencia</p>
                <p className="font-black text-3xl tracking-[0.3em] text-gray-900">{codigoRef}</p>
                <BarcodeSimulado />
                <p className="text-xs text-gray-400 font-mono">{ref}</p>
              </div>

              {/* Validez y red */}
              <div className="px-5 py-3 flex justify-between text-xs border-b border-dashed border-gray-200">
                <div>
                  <p className="text-gray-400 uppercase tracking-wide">Válido por</p>
                  <p className="font-bold text-gray-700">48 horas</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 uppercase tracking-wide">Red</p>
                  <p className="font-bold text-gray-700">{cfg.redPuntos.split("+")[0]}+ puntos</p>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="px-5 py-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Cómo pagar:</p>
                <ol className="space-y-2">
                  {cfg.instrucciones.map((inst, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600">
                      <span className="font-black text-xs flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: cfg.acento }}>
                        {i + 1}
                      </span>
                      {inst}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Separador estilo ticket perforado */}
            <div className="bg-white flex items-center gap-1 px-3 border-x-2 border-dashed" style={{ borderColor: cfg.acento }}>
              <div className="w-4 h-4 rounded-full -ml-5 flex-shrink-0" style={{ backgroundColor: cfg.bgPage }} />
              <div className="flex-1 border-t-2 border-dashed border-gray-200" />
              <div className="w-4 h-4 rounded-full -mr-5 flex-shrink-0" style={{ backgroundColor: cfg.bgPage }} />
            </div>

            {/* Botón de simulación */}
            <div className="bg-white rounded-b-2xl px-5 pb-5 pt-4 border-x-2 border-b-2 border-dashed" style={{ borderColor: cfg.acento }}>
              <p className="text-xs text-center text-gray-400 mb-3">
                — Ambiente de pruebas —
              </p>
              <button
                onClick={confirmarPago}
                disabled={procesando}
                className="w-full py-3 rounded-xl font-bold text-white transition-opacity disabled:opacity-60 text-sm"
                style={{ backgroundColor: cfg.acento }}
              >
                {procesando ? "Procesando..." : `Simular: Pago confirmado en punto ${cfg.nombre}`}
              </button>
            </div>
          </>
        )}

        {paso === 2 && (
          <div className="bg-white rounded-b-2xl shadow p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: cfg.bgPage }}>
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke={cfg.acento} strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-black mb-1" style={{ color: cfg.textColor }}>¡Pago confirmado!</h3>
            <p className="text-sm text-gray-500 mb-5">El punto {cfg.nombre} registró tu pago correctamente.</p>
            <div className="rounded-xl p-4 text-left text-sm space-y-2" style={{ backgroundColor: cfg.bgPage }}>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <span className="font-bold uppercase" style={{ color: cfg.acento }}>Confirmado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Referencia</span>
                <span className="font-mono text-xs text-gray-700">{codigoRef}</span>
              </div>
              <div className="flex justify-between border-t pt-2" style={{ borderColor: cfg.acento + "44" }}>
                <span className="text-gray-600 font-medium">Valor pagado</span>
                <span className="font-bold">${monto.toLocaleString("es-CO")} COP</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-5">Puedes cerrar esta ventana</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-400">
          <span>🏪 {cfg.redPuntos}</span>
        </div>
      </div>
    </div>
  );
}

export default function EfectivoSimuladorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="w-10 h-10 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
      </div>
    }>
      <EfectivoContenido />
    </Suspense>
  );
}
