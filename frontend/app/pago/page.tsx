"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import SuccessIcon from "@/components/icons/SuccessIcon";
import ErrorIcon from "@/components/icons/ErrorIcon";
import { guardarTransaccion, guardarFactura, type Factura } from "@/lib/transacciones";
import { generarFacturaPDF } from "@/lib/generarFacturaPDF";

const TASAS_IVA: Record<"GENERAL" | "REDUCIDO" | "EXENTO", number> = { GENERAL: 19, REDUCIDO: 5, EXENTO: 0 };
const NOMBRE_IMPUESTO: Record<"GENERAL" | "REDUCIDO" | "EXENTO", string> = {
  GENERAL:  "IVA General (19%)",
  REDUCIDO: "IVA Reducido (5%)",
  EXENTO:   "Exento (0%)",
};
const TARIFAS_ENVIO: Record<string, number> = { Cali: 0, Bogota: 15000, Medellin: 12000 };

function calcularDescuentoAuto(subtotal: number, producto: string, categoria: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const reglas: Array<{
      activa: boolean;
      fechaInicio: string;
      fechaFin: string;
      tipoValor: "porcentaje" | "monto";
      valorDescuento: number;
      objetivo: string;
    }> = JSON.parse(localStorage.getItem("reglas_descuento") || "[]");

    const ahora = new Date();
    const aplicables = reglas.filter(
      (r) =>
        r.activa &&
        new Date(r.fechaInicio) <= ahora &&
        new Date(r.fechaFin) >= ahora &&
        (r.objetivo === producto || r.objetivo === categoria)
    );

    if (aplicables.length === 0) return 0;

    const mejorDescuento = Math.max(
      ...aplicables.map((r) =>
        r.tipoValor === "porcentaje"
          ? Math.round(subtotal * (r.valorDescuento / 100))
          : r.valorDescuento
      )
    );

    return Math.min(mejorDescuento, subtotal);
  } catch {
    return 0;
  }
}

function validarTipoImpuesto(valor: string | null): "GENERAL" | "REDUCIDO" | "EXENTO" {
  if (valor === "GENERAL" || valor === "REDUCIDO" || valor === "EXENTO") return valor;
  return "GENERAL";
}

// ── Componente principal ────────────────────────────────────────────────────────
function PasarelaPago() {
  const searchParams = useSearchParams();

  const pedidoId      = searchParams.get("pedidoId") ?? "";
  const montoParam    = searchParams.get("monto");
  const productoParam = searchParams.get("producto") ?? "";
  const categoriaParam= searchParams.get("categoria") ?? "";
  const emailParam    = searchParams.get("email") ?? "";

  const subtotalOriginal = parseFloat(montoParam ?? "0");
  const tipoImpuestoInicial = validarTipoImpuesto(searchParams.get("tipoImpuesto"));
  const ciudadInicial = searchParams.get("ciudad") ?? "Bogota";

  const paramsValidos = pedidoId.trim() !== "" && subtotalOriginal > 0;

  const [metodoPago,    setMetodoPago]    = useState("TARJETA");
  const [paso,          setPaso]          = useState(1);
  const [mensajeError,  setMensajeError]  = useState<string | null>(null);
  const [pagoExitoso,   setPagoExitoso]   = useState<{ mensaje: string; transaccionId: string; linkPago?: string; esAsincrono?: boolean } | null>(null);
  const [clienteEmail,  setClienteEmail]  = useState(emailParam);
  const [datosTarjeta,  setDatosTarjeta]  = useState({ titular: "", numero: "", fecha: "", cvv: "", cuotas: "1" });
  const [tipoPersona,   setTipoPersona]   = useState("natural");
  const [bancoPse,      setBancoPse]      = useState("");
  const [documentoPse,  setDocumentoPse]  = useState("");
  const [telefonoNequi, setTelefonoNequi] = useState("");
  const [wompiTxId,     setWompiTxId]     = useState<string | null>(null);
  const pollingRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentosRef    = useRef(0);
  const [guardarTarjeta,setGuardarTarjeta]= useState(false);
  const [esperandoPse,  setEsperandoPse]  = useState(false);
  const [facturaActual, setFacturaActual] = useState<Factura | null>(null);

  const [descuentoAuto,  setDescuentoAuto]  = useState(0);
  const [reglaAutoLabel, setReglaAutoLabel] = useState<string | null>(null);

  const [codigoCupon,   setCodigoCupon]   = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<{ codigo: string; descuento: number; descripcion: string; montoMinimo: number } | null>(null);
  const [cuponError,    setCuponError]    = useState<string | null>(null);
  const [cuponCargando, setCuponCargando] = useState(false);

  const [tipoImpuesto, setTipoImpuesto] = useState<"GENERAL" | "REDUCIDO" | "EXENTO">(tipoImpuestoInicial);
  const [ciudad,       setCiudad]       = useState(ciudadInicial);

  const [pedidoRegistrado,    setPedidoRegistrado]    = useState(false);
  const [errorRegistro,       setErrorRegistro]       = useState<string | null>(null);

  // Registrar el pedido en el backend al montar (si los params son válidos)
  useEffect(() => {
    if (!paramsValidos) return;
    fetch("http://localhost:4000/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId, totalFinal: subtotalOriginal }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setPedidoRegistrado(true);
        } else {
          setErrorRegistro(data.message ?? "No se pudo registrar el pedido.");
        }
      })
      .catch(() => setErrorRegistro("No se pudo conectar con el servidor. Verifica que el backend esté activo."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transporteSimulado = TARIFAS_ENVIO[ciudad] ?? 20000;
  const porcentajeActual   = TASAS_IVA[tipoImpuesto];

  const descuentoCupon       = cuponAplicado?.descuento ?? 0;
  const totalDescuentos      = descuentoAuto + descuentoCupon;
  const subtotalConDescuento = Math.max(subtotalOriginal - totalDescuentos, 0);
  const ivaSimulado          = Math.round(subtotalConDescuento * (porcentajeActual / 100));
  const totalReal            = subtotalConDescuento + transporteSimulado + ivaSimulado;
  const descuentoAplicadoBackend = (subtotalOriginal + transporteSimulado + Math.round(subtotalOriginal * porcentajeActual / 100)) - totalReal;

  useEffect(() => {
    if (!paramsValidos) return;
    const desc = calcularDescuentoAuto(subtotalOriginal, productoParam, categoriaParam);
    setDescuentoAuto(desc);
    if (desc > 0) {
      try {
        const reglas: Array<{ activa: boolean; fechaInicio: string; fechaFin: string; tipoValor: string; valorDescuento: number; objetivo: string }> =
          JSON.parse(localStorage.getItem("reglas_descuento") || "[]");
        const ahora = new Date();
        const vigente = reglas.find(
          (r) =>
            r.activa &&
            new Date(r.fechaInicio) <= ahora &&
            new Date(r.fechaFin) >= ahora &&
            (r.objetivo === productoParam || r.objetivo === categoriaParam)
        );
        if (vigente) setReglaAutoLabel(`Desc. automático — ${vigente.objetivo} (${vigente.tipoValor === "porcentaje" ? `${vigente.valorDescuento}%` : `$${vigente.valorDescuento.toLocaleString("es-CO")}`})`);
      } catch { /* noop */ }
    }
  }, [subtotalOriginal, paramsValidos, productoParam, categoriaParam]);

  useEffect(() => {
    if (!cuponAplicado || cuponAplicado.montoMinimo === 0) return;
    const totalSinCupon = totalReal + descuentoCupon;
    if (totalSinCupon < cuponAplicado.montoMinimo) {
      setCuponAplicado(null);
      setCuponError(`Cupón removido: el total ($${totalSinCupon.toLocaleString("es-CO")}) bajó del mínimo requerido de $${cuponAplicado.montoMinimo.toLocaleString("es-CO")} COP.`);
    }
  }, [totalReal, cuponAplicado, descuentoCupon]);

  const aplicarCupon = async () => {
    if (!codigoCupon.trim()) return;
    setCuponError(null);
    setCuponCargando(true);
    try {
      const res = await fetch("http://localhost:4000/cupones/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigoCupon.trim().toUpperCase(), monto: totalReal, clienteEmail }),
      });
      const data = await res.json();
      if (data.valido) {
        setCuponAplicado({
          codigo:      data.cupon?.codigo      || codigoCupon.toUpperCase(),
          descuento:   data.descuentoAplicado,
          descripcion: data.cupon?.descripcion || "",
          montoMinimo: data.cupon?.montoMinimo ?? 0,
        });
        setCodigoCupon("");
      } else {
        setCuponError(data.motivo || "Cupón no válido.");
      }
    } catch {
      setCuponError("No se pudo conectar con el servidor para validar el cupón.");
    } finally {
      setCuponCargando(false);
    }
  };

  const quitarCupon = () => { setCuponAplicado(null); setCuponError(null); };

  const registrarPago = (transaccionId: string, estado: "APROBADO" | "PENDIENTE") => {
    const factura: Factura = {
      id: transaccionId,
      pedidoId,
      fecha: new Date().toISOString(),
      monto: totalReal,
      metodoPago,
      estado,
      clienteEmail: clienteEmail || "cliente@email.com",
      subtotal: subtotalConDescuento,
      transporte: transporteSimulado,
      iva: ivaSimulado,
      porcentajeIva: porcentajeActual,
      estadoFactura: "VIGENTE",
      ciudad,
      tipoImpuesto,
    };
    guardarTransaccion(factura);
    guardarFactura(factura);
    setFacturaActual(factura);
  };

  useEffect(() => {
    if (!esperandoPse || !wompiTxId) return;
    intentosRef.current = 0;
    pollingRef.current = setInterval(async () => {
      intentosRef.current += 1;
      if (intentosRef.current > 20) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        setEsperandoPse(false);
        setMensajeError("Tiempo de espera agotado. El pago no fue confirmado en Wompi.");
        setPaso(1);
        return;
      }
      try {
        const res  = await fetch(`http://localhost:4000/pagos/estado/${wompiTxId}`);
        const data = await res.json();
        if (data.aprobado) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setEsperandoPse(false);
          const msg = metodoPago === "NEQUI" ? "Pago Nequi aprobado en Wompi" : "Pago PSE aprobado en Wompi";
          setPagoExitoso((prev) => prev ? { ...prev, esAsincrono: false, mensaje: msg } : prev);
          setFacturaActual((prev) => prev ? { ...prev, estado: "APROBADO", estadoFactura: "VIGENTE" } : prev);
          setPaso(3);
        }
      } catch { /* reintenta en el siguiente tick */ }
    }, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [esperandoPse, wompiTxId, metodoPago]);

  const verificarEstadoWompi = async () => {
    if (!wompiTxId) return alert("No se encontró el ID de transacción Wompi.");
    try {
      const res  = await fetch(`http://localhost:4000/pagos/estado/${wompiTxId}`);
      const data = await res.json();
      if (data.aprobado) {
        setEsperandoPse(false);
        const msg = metodoPago === "NEQUI" ? "Pago Nequi aprobado en Wompi" : "Pago PSE aprobado en Wompi";
        setPagoExitoso((prev) => prev ? { ...prev, esAsincrono: false, mensaje: msg } : prev);
        setFacturaActual((prev) => prev ? { ...prev, estado: "APROBADO", estadoFactura: "VIGENTE" } : prev);
        setPaso(3);
      } else {
        alert(`Estado Wompi: ${data.estado}. ${data.motivoRechazo || "El pago aún no fue aprobado."}`);
      }
    } catch {
      alert("Error al verificar el estado. Asegúrate de que el backend esté activo.");
    }
  };

  const simularPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setPagoExitoso(null);
    if (metodoPago === "TARJETA" && !datosTarjeta.titular.trim()) return alert("Ingresa el nombre del titular de la tarjeta");
    if (metodoPago === "TARJETA" && (!datosTarjeta.numero || !datosTarjeta.cvv)) return alert("Completa los datos de la tarjeta");
    if (metodoPago === "PSE" && (!bancoPse || !documentoPse)) return alert("Selecciona tu banco y documento para PSE");
    if (metodoPago === "NEQUI" && telefonoNequi.length < 10) return alert("Ingresa un número de celular válido");
    setPaso(2);
    try {
      const datosParaBackend =
        metodoPago === "TARJETA" ? { ...datosTarjeta, titular: (datosTarjeta.titular || "").trim().toUpperCase(), fechaExp: datosTarjeta.fecha, guardarMetodo: guardarTarjeta, email: clienteEmail }
        : metodoPago === "PSE"   ? { tipoPersona, bancoPse, documentoPse, email: clienteEmail }
        : { telefonoNequi, email: clienteEmail };

      const respuesta = await fetch("http://localhost:4000/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId,
          metodoPago,
          datosPago: datosParaBackend,
          totalCobrado: totalReal,
          descuentoAplicado: descuentoAplicadoBackend,
          cuponCodigo: cuponAplicado?.codigo || undefined,
          clienteEmail,
          subtotal: subtotalConDescuento,
          transporte: transporteSimulado,
          iva: ivaSimulado,
          porcentajeIva: porcentajeActual,
          ciudad,
          tipoImpuesto,
        }),
      });
      const data = await respuesta.json();
      if (respuesta.ok && data.aprobado) {
        setPagoExitoso({ mensaje: data.mensaje, transaccionId: data.transaccionId, linkPago: data.linkPago, esAsincrono: data.esAsincrono });
        setMensajeError(null);
        if (data.esAsincrono) {
          registrarPago(data.transaccionId, "PENDIENTE");
          setWompiTxId(data.wompiTransaccionId ?? null);
          if (metodoPago === "PSE" && data.linkPago) window.open(data.linkPago, "_blank");
          setEsperandoPse(true);
        } else {
          registrarPago(data.transaccionId, "APROBADO");
          setPaso(3);
        }
      } else {
        setPagoExitoso(null);
        setMensajeError(data.message ?? "Error desconocido");
        setPaso(1);
      }
    } catch {
      setMensajeError("Error de conexión con el servidor. Verifica que el backend esté activo.");
      setPaso(1);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";
  const labelCls = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";
  const hayDescuento = totalDescuentos > 0;

  // ── Estado: params inválidos ──────────────────────────────────────────────────
  if (!paramsValidos) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">Datos de pedido requeridos</h2>
          <p className="text-sm text-slate-500 mb-6">
            Esta página recibe los datos del pedido desde el módulo de ventas. Los parámetros <code className="bg-slate-100 px-1 rounded">pedidoId</code> y <code className="bg-slate-100 px-1 rounded">monto</code> son obligatorios.
          </p>
          <div className="text-left bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs font-mono text-slate-600 break-all">
            /pago?pedidoId=ORD-001&amp;monto=150000&amp;producto=Laptop&amp;categoria=Electronica&amp;email=cliente@correo.com
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: error al registrar pedido ────────────────────────────────────────
  if (errorRegistro) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ErrorIcon className="w-7 h-7 text-rose-600" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">No se pudo iniciar el pago</h2>
          <p className="text-sm text-rose-700">{errorRegistro}</p>
        </div>
      </div>
    );
  }

  // ── Estado: esperando confirmación del registro ───────────────────────────────
  if (!pedidoRegistrado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Checkout principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Checkout</p>
          <h1 className="text-2xl font-black text-slate-900">Completa tu pago</h1>
          {productoParam && (
            <p className="text-sm text-slate-500 mt-1">{productoParam}{categoriaParam ? ` · ${categoriaParam}` : ""}</p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* ── RESUMEN ────────────────────────────────────────────── */}
          <div className="w-full md:w-[300px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              <div className="bg-slate-900 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Pedido</p>
                <p className="font-mono text-indigo-400 font-bold">{pedidoId}</p>
              </div>
              <div className="px-5 py-5 space-y-2.5 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <div className="text-right">
                    {hayDescuento && (
                      <span className="line-through text-slate-400 text-xs mr-1.5">
                        ${subtotalOriginal.toLocaleString("es-CO")}
                      </span>
                    )}
                    <span className="text-slate-800 font-medium">${subtotalConDescuento.toLocaleString("es-CO")}</span>
                  </div>
                </div>

                {descuentoAuto > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="text-xs font-medium">Desc. automático</span>
                    <span className="font-semibold text-xs">-${descuentoAuto.toLocaleString("es-CO")}</span>
                  </div>
                )}

                {descuentoCupon > 0 && (
                  <div className="flex justify-between text-indigo-700">
                    <span className="text-xs font-medium">Cupón {cuponAplicado?.codigo}</span>
                    <span className="font-semibold text-xs">-${descuentoCupon.toLocaleString("es-CO")}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">Envío ({ciudad})</span>
                  <span className="text-slate-800 font-medium">
                    {transporteSimulado === 0 ? "Gratis" : `$${transporteSimulado.toLocaleString("es-CO")}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs leading-tight">{NOMBRE_IMPUESTO[tipoImpuesto]}</span>
                  <span className="text-slate-800 font-medium">${ivaSimulado.toLocaleString("es-CO")}</span>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Total</span>
                    <div className="text-right">
                      {hayDescuento && (
                        <p className="text-xs text-emerald-600 font-semibold mb-0.5">
                          Ahorras ${totalDescuentos.toLocaleString("es-CO")}
                        </p>
                      )}
                      <span className="font-black text-lg text-slate-900">${totalReal.toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 text-right">COP</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Pago 100% seguro y encriptado
                </div>
              </div>
            </div>
          </div>

          {/* ── FORMULARIO ─────────────────────────────────────────── */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* PASO 1: FORMULARIO */}
            {paso === 1 && (
              <div className="p-6 md:p-8">

                {descuentoAuto > 0 && reglaAutoLabel && (
                  <div className="mb-6 flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">{reglaAutoLabel}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Ahorras <strong>${descuentoAuto.toLocaleString("es-CO")} COP</strong> automáticamente.</p>
                    </div>
                  </div>
                )}

                {mensajeError && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 p-4">
                    <ErrorIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-800">Transacción rechazada</p>
                      <p className="text-xs text-rose-700 mt-0.5">{mensajeError}</p>
                    </div>
                    <button onClick={() => setMensajeError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}

                {metodoPago !== "TARJETA" && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-indigo-50 border border-indigo-100 p-3.5 text-sm text-indigo-800">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {metodoPago === "PSE"
                      ? "Serás redirigido al portal de tu banco (vía Wompi) para completar el pago."
                      : "Recibirás una notificación push en tu app Nequi."}
                  </div>
                )}

                <div className="mb-7">
                  <p className={labelCls}>Método de pago</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "TARJETA", label: "Tarjeta",  icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
                      { id: "PSE",     label: "PSE",      icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" },
                      { id: "NEQUI",   label: "Nequi",    icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPago(m.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition ${
                          metodoPago === m.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                        </svg>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={simularPago} className="space-y-5">

                  {/* Entrega e impuesto */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Entrega y tipo de producto</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Ciudad de entrega</label>
                        <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputCls}>
                          <option value="Cali">Cali — Envío gratis</option>
                          <option value="Bogota">Bogotá — $15.000</option>
                          <option value="Medellin">Medellín — $12.000</option>
                          <option value="Otra">Otra ciudad — $20.000</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Tarifa: ${transporteSimulado.toLocaleString("es-CO")} COP</p>
                      </div>
                      <div>
                        <label className={labelCls}>Tipo de producto (IVA)</label>
                        <select
                          value={tipoImpuesto}
                          onChange={(e) => setTipoImpuesto(e.target.value as "GENERAL" | "REDUCIDO" | "EXENTO")}
                          className={inputCls}
                        >
                          <option value="REDUCIDO">Reducido — 5% (alimentos, libros...)</option>
                          <option value="GENERAL">General — 19% (electrónica, ropa...)</option>
                          <option value="EXENTO">Exento — 0% (medicamentos, educación...)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">{NOMBRE_IMPUESTO[tipoImpuesto]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelCls}>Correo para el recibo</label>
                    <input type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="tu@correo.com" className={inputCls} />
                    <p className="text-xs text-slate-400 mt-1">Recibirás el comprobante en PDF al finalizar.</p>
                  </div>

                  {/* Cupón */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Cupón de descuento</p>
                    {cuponAplicado ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-black text-indigo-900 tracking-wider">{cuponAplicado.codigo}</p>
                            <p className="text-xs text-indigo-700">-<strong>${cuponAplicado.descuento.toLocaleString("es-CO")} COP</strong>{cuponAplicado.descripcion && ` · ${cuponAplicado.descripcion}`}</p>
                          </div>
                        </div>
                        <button type="button" onClick={quitarCupon} className="text-xs text-slate-400 hover:text-rose-600 transition font-semibold px-2 py-1 rounded-lg hover:bg-rose-50">Quitar</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={codigoCupon}
                          onChange={(e) => { setCodigoCupon(e.target.value.toUpperCase()); setCuponError(null); }}
                          placeholder="Ej: BIENVENIDO10"
                          className={inputCls + " flex-1"}
                          style={{ textTransform: "uppercase" }}
                        />
                        <button
                          type="button"
                          onClick={aplicarCupon}
                          disabled={cuponCargando || !codigoCupon.trim()}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-xs disabled:opacity-60 whitespace-nowrap"
                        >
                          {cuponCargando ? "..." : "Aplicar"}
                        </button>
                      </div>
                    )}
                    {cuponError && (
                      <p className="text-xs text-rose-700 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
                        {cuponError}
                      </p>
                    )}
                  </div>

                  {/* TARJETA */}
                  {metodoPago === "TARJETA" && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Titular de la tarjeta</label>
                        <input type="text" value={datosTarjeta.titular} onChange={(e) => setDatosTarjeta({ ...datosTarjeta, titular: e.target.value.toUpperCase() })} placeholder="NOMBRE APELLIDO" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Número de tarjeta</label>
                        <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={datosTarjeta.numero}
                          onChange={(e) => { const raw = e.target.value.replace(/\D/g,""); const fmt = raw.match(/.{1,4}/g)?.join(" ") || ""; setDatosTarjeta({ ...datosTarjeta, numero: fmt.slice(0,19) }); }}
                          className={inputCls} required />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={labelCls}>Vencimiento</label>
                          <input type="text" placeholder="MM/AA" maxLength={5} value={datosTarjeta.fecha}
                            onChange={(e) => { let v = e.target.value.replace(/\D/g,"").slice(0,4); if(v.length>=3) v=v.slice(0,2)+"/"+v.slice(2); setDatosTarjeta({ ...datosTarjeta, fecha: v }); }}
                            className={inputCls} required />
                        </div>
                        <div>
                          <label className={labelCls}>CVV</label>
                          <input type="password" placeholder="•••" maxLength={4} onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cvv: e.target.value })} className={inputCls} required />
                        </div>
                        <div>
                          <label className={labelCls}>Cuotas</label>
                          <select value={datosTarjeta.cuotas} onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cuotas: e.target.value })} className={inputCls}>
                            <option value="1">1 cuota</option>
                            <option value="6">6 cuotas</option>
                            <option value="12">12 cuotas</option>
                            <option value="24">24 cuotas</option>
                          </select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                        <input type="checkbox" checked={guardarTarjeta} onChange={(e) => setGuardarTarjeta(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm text-slate-600">Guardar tarjeta para futuras compras</span>
                      </label>
                    </div>
                  )}

                  {/* PSE */}
                  {metodoPago === "PSE" && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Tipo de persona</label>
                        <select value={tipoPersona} onChange={(e) => setTipoPersona(e.target.value)} className={inputCls}>
                          <option value="natural">Persona Natural</option>
                          <option value="juridica">Persona Jurídica</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Banco</label>
                        <select value={bancoPse} onChange={(e) => setBancoPse(e.target.value)} className={inputCls}>
                          <option value="">Selecciona tu banco...</option>
                          <option value="1001">Banco de Bogotá</option>
                          <option value="1007">Bancolombia</option>
                          <option value="1051">Davivienda</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Número de documento</label>
                        <input type="text" placeholder="CC o NIT" value={documentoPse} onChange={(e) => setDocumentoPse(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  )}

                  {/* NEQUI */}
                  {metodoPago === "NEQUI" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 text-white">
                        <span className="font-black text-sm tracking-wider">NEQUI</span>
                        <p className="text-xs text-slate-300">Wompi enviará un push a tu app Nequi para aprobar el pago.</p>
                      </div>
                      <div>
                        <label className={labelCls}>Número de celular Nequi</label>
                        <input type="text" placeholder="3000000000" value={telefonoNequi} onChange={(e) => setTelefonoNequi(e.target.value.replace(/\D/g,"").slice(0,10))} className={inputCls} />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition text-sm">
                    {`Pagar $${totalReal.toLocaleString("es-CO")} COP`}
                  </button>
                </form>
              </div>
            )}

            {/* PASO 2: PROCESANDO */}
            {paso === 2 && (
              <div className="p-8 flex flex-col items-center justify-center min-h-[320px] text-center">
                {!esperandoPse ? (
                  <>
                    <div className="w-14 h-14 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-6" />
                    <h2 className="text-lg font-bold text-slate-900">
                      {metodoPago === "PSE" ? "Conectando con tu banco..." : metodoPago === "NEQUI" ? "Enviando notificación Nequi..." : "Procesando pago..."}
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">Por favor, no cierres esta ventana.</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-5">
                      <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">
                      {metodoPago === "NEQUI" ? "Esperando tu aprobación en Nequi" : "Esperando confirmación del banco"}
                    </h2>
                    <p className="text-sm text-slate-500 mb-2">
                      {metodoPago === "NEQUI"
                        ? "Abre tu app Nequi y aprueba la solicitud de pago."
                        : "Completa el pago en la pestaña del banco y regresa aquí."}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                      <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                      Verificando estado del pago…
                    </div>
                    <button onClick={verificarEstadoWompi} className="px-5 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition text-xs border border-slate-200">
                      Verificar ahora
                    </button>
                  </>
                )}
              </div>
            )}

            {/* PASO 3: RESULTADO */}
            {paso === 3 && pagoExitoso && (
              <div className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SuccessIcon className="w-9 h-9 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">
                    {pagoExitoso.esAsincrono ? "Solicitud registrada" : "Pago exitoso"}
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">{pagoExitoso.mensaje}</p>

                  {!pagoExitoso.esAsincrono && facturaActual && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3.5 text-left">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-800">Comprobante enviado por correo</p>
                        <p className="text-xs text-indigo-600 mt-0.5">{facturaActual.clienteEmail}</p>
                      </div>
                    </div>
                  )}

                  {pagoExitoso.linkPago && pagoExitoso.esAsincrono && (
                    <a href={pagoExitoso.linkPago} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 mb-4 text-white font-bold rounded-xl shadow-md transition" style={{ backgroundColor: "#009EE3" }}>
                      Ir a pagar / Ver recibo
                    </a>
                  )}

                  {!pagoExitoso.esAsincrono && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 mb-4 inline-block">
                      <p className="text-xs text-slate-400 mb-1">ID de transacción</p>
                      <p className="font-mono font-bold text-slate-900 tracking-wider">{pagoExitoso.transaccionId}</p>
                    </div>
                  )}

                  {!pagoExitoso.esAsincrono && facturaActual && (
                    <div className="mb-6">
                      <button onClick={() => generarFacturaPDF(facturaActual)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition text-sm mx-auto">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                        Descargar factura PDF
                      </button>
                    </div>
                  )}

                  <ResumenCompra subtotal={subtotalConDescuento} transporte={transporteSimulado} iva={ivaSimulado} pct={porcentajeActual} total={totalReal} descuentos={totalDescuentos} />
                </div>

                <div className="mt-8 text-center">
                  <button onClick={() => { setPaso(1); setPagoExitoso(null); setMensajeError(null); }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
                    Volver al checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumenCompra({ subtotal, transporte, iva, pct, total, descuentos }: { subtotal: number; transporte: number; iva: number; pct: number; total: number; descuentos: number }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-left mt-4">
      <p className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wide">Resumen del pago</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="text-slate-800 font-medium">${subtotal.toLocaleString("es-CO")}</span></div>
        {descuentos > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span className="text-xs font-medium">Descuentos aplicados</span>
            <span className="text-xs font-semibold">-${descuentos.toLocaleString("es-CO")}</span>
          </div>
        )}
        <div className="flex justify-between text-sm"><span className="text-slate-500">Transporte</span><span className="text-slate-800 font-medium">${transporte.toLocaleString("es-CO")}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">IVA ({pct}%)</span><span className="text-slate-800 font-medium">${iva.toLocaleString("es-CO")}</span></div>
        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
          <span>Total pagado</span><span>${total.toLocaleString("es-CO")} COP</span>
        </div>
      </div>
    </div>
  );
}

export default function PasarelaPagoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    }>
      <PasarelaPago />
    </Suspense>
  );
}
