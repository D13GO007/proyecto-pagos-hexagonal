"use client";

import { useState, useEffect } from "react";
import SuccessIcon from "@/components/icons/SuccessIcon";
import ErrorIcon from "@/components/icons/ErrorIcon";
import { guardarTransaccion, guardarFactura, type Factura } from "@/lib/transacciones";
import { generarFacturaPDF } from "@/lib/generarFacturaPDF";

// HU17: tasas de impuesto según tipo de producto (mismas reglas que CalculadorTasas del backend)
const TASAS_IVA: Record<"GENERAL" | "REDUCIDO" | "EXENTO", number> = { GENERAL: 19, REDUCIDO: 5, EXENTO: 0 };
// HU18: nombre técnico del impuesto visible para el cliente
const NOMBRE_IMPUESTO: Record<"GENERAL" | "REDUCIDO" | "EXENTO", string> = {
  GENERAL:  "IVA General (19%)",
  REDUCIDO: "IVA Reducido (5%)",
  EXENTO:   "Exento (0%)",
};
// HU18: tarifas de envío por ciudad (misma lógica que CalculadorEnvio del backend)
const TARIFAS_ENVIO: Record<string, number> = { Cali: 0, Bogota: 15000, Medellin: 12000 };

// HU11 + HU12: lee reglas activas y filtra por producto/categoría del pedido actual
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
    // HU12: solo aplica reglas cuyo objetivo coincide con el producto o categoría del pedido
    const aplicables = reglas.filter(
      (r) =>
        r.activa &&
        new Date(r.fechaInicio) <= ahora &&
        new Date(r.fechaFin) >= ahora &&
        (r.objetivo === producto || r.objetivo === categoria)
    );

    if (aplicables.length === 0) return 0;

    // HU11: aplica la regla de mayor descuento (mejor oferta automática)
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

export default function PasarelaPago() {
  const [metodoPago,    setMetodoPago]    = useState("TARJETA");
  const [paso,          setPaso]          = useState(1);
  const [mensajeError,  setMensajeError]  = useState<string | null>(null);
  const [pagoExitoso,   setPagoExitoso]   = useState<{ mensaje: string; transaccionId: string; linkPago?: string; esAsincrono?: boolean; codigoPago?: string; puntoPago?: string } | null>(null);
  const [clienteEmail,  setClienteEmail]  = useState("diegoandresrm43210@gmail.com");
  const [datosTarjeta,  setDatosTarjeta]  = useState({ titular: "", numero: "", fecha: "", cvv: "", cuotas: "1" });
  const [tipoPersona,   setTipoPersona]   = useState("natural");
  const [bancoPse,      setBancoPse]      = useState("");
  const [documentoPse,  setDocumentoPse]  = useState("");
  const [telefonoNequi, setTelefonoNequi] = useState("");
  const [metodoEfectivo,setMetodoEfectivo]= useState("efecty");
  const [guardarTarjeta,setGuardarTarjeta]= useState(false);
  const [esperandoPse,  setEsperandoPse]  = useState(false);
  const [facturaActual, setFacturaActual] = useState<Factura | null>(null);

  // HU11: descuento automático calculado al montar
  const [descuentoAuto, setDescuentoAuto] = useState(0);
  const [reglaAutoLabel, setReglaAutoLabel] = useState<string | null>(null);

  // HU14: cupón ingresado manualmente
  const [codigoCupon,   setCodigoCupon]   = useState("");
  const [cuponAplicado, setCuponAplicado] = useState<{ codigo: string; descuento: number; descripcion: string; montoMinimo: number } | null>(null);
  const [cuponError,    setCuponError]    = useState<string | null>(null);
  const [cuponCargando, setCuponCargando] = useState(false);

  // HU17: tipo de impuesto según producto (GENERAL 19% / REDUCIDO 5% / EXENTO 0%)
  const [tipoImpuesto, setTipoImpuesto] = useState<"GENERAL" | "REDUCIDO" | "EXENTO">("REDUCIDO");
  // HU18: ciudad de entrega para calcular costo de envío (CalculadorEnvio)
  const [ciudad, setCiudad] = useState("Bogota");

  // HU12: cada pedido lleva producto y categoría para filtrar reglas de descuento
  const CASOS_PRUEBA: Record<string, { subtotal: number; producto: string; categoria: string }> = {
    "PED-101": { subtotal: 150000, producto: "Laptop Pro X",      categoria: "Electronica"  },
    "PED-102": { subtotal: 300000, producto: "Monitor 4K",        categoria: "Electronica"  },
    "PED-103": { subtotal: 850000, producto: "Audifonos BT",      categoria: "Accesorios"   },
    "PED-104": { subtotal: 50000,  producto: "Mouse Inalambrico", categoria: "Perifericos"  },
    "PED-456": { subtotal: 80000,  producto: "Teclado Mecanico",  categoria: "Perifericos"  },
    "PED-CAN": { subtotal: 120000, producto: "Laptop Pro X",      categoria: "Electronica"  },
    "PED-789": { subtotal: 200000, producto: "Monitor 4K",        categoria: "Electronica"  },
  };

  const ID_ACTUAL        = "PED-102";
  const casoPrueba       = CASOS_PRUEBA[ID_ACTUAL];
  const subtotalOriginal = casoPrueba.subtotal;
  // HU18: transporte según ciudad elegida (CalculadorEnvio: Cali $0, Bogotá $15k, Medellín $12k)
  const transporteSimulado = TARIFAS_ENVIO[ciudad] ?? 20000;
  // HU17: porcentaje de IVA según tipo de impuesto seleccionado (GENERAL/REDUCIDO/EXENTO)
  const porcentajeActual   = TASAS_IVA[tipoImpuesto];

  // HU11 + HU14: cálculo dinámico de totales con descuentos
  const descuentoCupon       = cuponAplicado?.descuento ?? 0;
  const totalDescuentos      = descuentoAuto + descuentoCupon;
  const subtotalConDescuento = Math.max(subtotalOriginal - totalDescuentos, 0);
  const ivaSimulado          = Math.round(subtotalConDescuento * (porcentajeActual / 100));
  const totalReal            = subtotalConDescuento + transporteSimulado + ivaSimulado;
  // descuentoAplicado que se envía al backend = pedido.totalFinal(335 000) - totalReal
  const descuentoAplicadoBackend = (subtotalOriginal + transporteSimulado + Math.round(subtotalOriginal * porcentajeActual / 100)) - totalReal;

  // HU11 + HU12: calcular descuento automático filtrando por producto/categoría del pedido
  useEffect(() => {
    if (typeof window === "undefined") return;
    const desc = calcularDescuentoAuto(subtotalOriginal, casoPrueba.producto, casoPrueba.categoria);
    setDescuentoAuto(desc);
    if (desc > 0) {
      try {
        const reglas: Array<{ activa: boolean; fechaInicio: string; fechaFin: string; tipoValor: string; valorDescuento: number; objetivo: string }> =
          JSON.parse(localStorage.getItem("reglas_descuento") || "[]");
        const ahora = new Date();
        // HU12: buscar la regla vigente que aplica a este producto o categoría
        const vigente = reglas.find(
          (r) =>
            r.activa &&
            new Date(r.fechaInicio) <= ahora &&
            new Date(r.fechaFin) >= ahora &&
            (r.objetivo === casoPrueba.producto || r.objetivo === casoPrueba.categoria)
        );
        if (vigente) setReglaAutoLabel(`Desc. automático — ${vigente.objetivo} (${vigente.tipoValor === "porcentaje" ? `${vigente.valorDescuento}%` : `$${vigente.valorDescuento.toLocaleString("es-CO")}`})`);
      } catch { /* noop */ }
    }
  }, [subtotalOriginal]);

  // HU15: revertir cupón automáticamente si el monto baja del mínimo requerido
  useEffect(() => {
    if (!cuponAplicado || cuponAplicado.montoMinimo === 0) return;
    const totalSinCupon = totalReal + descuentoCupon;
    if (totalSinCupon < cuponAplicado.montoMinimo) {
      setCuponAplicado(null);
      setCuponError(`Cupón removido: el total ($${totalSinCupon.toLocaleString("es-CO")}) bajó del mínimo requerido de $${cuponAplicado.montoMinimo.toLocaleString("es-CO")} COP.`);
    }
  }, [totalReal]);

  // HU14: validar cupón contra el backend
  const aplicarCupon = async () => {
    if (!codigoCupon.trim()) return;
    setCuponError(null);
    setCuponCargando(true);
    try {
      const res = await fetch("http://localhost:4000/cupones/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigoCupon.trim().toUpperCase(),
          monto: totalReal,          // monto ya con descuento automático aplicado
          clienteEmail,
        }),
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

  const quitarCupon = () => {
    setCuponAplicado(null);
    setCuponError(null);
  };

  const registrarPago = (transaccionId: string, estado: "APROBADO" | "PENDIENTE") => {
    const factura: Factura = {
      id: transaccionId,
      pedidoId: ID_ACTUAL,
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

  const verificarPagoPse = () => {
    const result = localStorage.getItem("pse_pago_resultado");
    if (result) {
      const data = JSON.parse(result);
      if (data.aprobado) {
        localStorage.removeItem("pse_pago_resultado");
        setEsperandoPse(false);
        const msg = metodoPago === "EFECTIVO" ? "Pago en efectivo confirmado" : metodoPago === "NEQUI" ? "Pago Nequi confirmado" : "Pago PSE confirmado";
        setPagoExitoso((prev) => prev ? { ...prev, esAsincrono: false, mensaje: msg } : prev);
        setFacturaActual((prev) => prev ? { ...prev, estado: "APROBADO", estadoFactura: "VIGENTE" } : prev);
        setPaso(3);
      }
    } else {
      alert("Aun no se ha confirmado el pago. Completa el pago en la pestana del banco.");
    }
  };

  const simularPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeError(null);
    setPagoExitoso(null);
    if (metodoPago === "TARJETA" && (!datosTarjeta.titular.trim())) return alert("Ingresa el nombre del titular de la tarjeta");
    if (metodoPago === "TARJETA" && (!datosTarjeta.numero || !datosTarjeta.cvv)) return alert("Completa los datos de la tarjeta");
    if (metodoPago === "PSE" && (!bancoPse || !documentoPse)) return alert("Selecciona tu banco y documento para PSE");
    if (metodoPago === "NEQUI" && telefonoNequi.length < 10) return alert("Ingresa un numero de celular valido");
    setPaso(2);
    try {
      const datosParaBackend =
        metodoPago === "TARJETA" ? { ...datosTarjeta, titular: (datosTarjeta.titular || "").trim().toUpperCase(), fechaExp: datosTarjeta.fecha, guardarMetodo: guardarTarjeta }
        : metodoPago === "PSE"   ? { tipoPersona, bancoPse, documentoPse }
        : metodoPago === "NEQUI" ? { telefonoNequi, tipoPersona, bancoPse, documentoPse }
        : { punto: metodoEfectivo };

      const respuesta = await fetch("http://localhost:4000/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: ID_ACTUAL,
          metodoPago,
          datosPago: datosParaBackend,
          totalCobrado: totalReal,
          // HU10: informar al backend sobre el descuento aplicado
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
        setPagoExitoso({ mensaje: data.mensaje, transaccionId: data.transaccionId, linkPago: data.linkPago, esAsincrono: data.esAsincrono, codigoPago: data.codigoPago, puntoPago: data.puntoPago });
        setMensajeError(null);
        if (data.esAsincrono && data.linkPago) {
          registrarPago(data.transaccionId, "PENDIENTE");
          window.open(data.linkPago, "_blank");
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
      setMensajeError("Error de conexion con el servidor. Verifica que el backend este activo.");
      setPaso(1);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition";
  const labelCls = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

  const hayDescuento = totalDescuentos > 0;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Checkout</p>
          <h1 className="text-2xl font-black text-slate-900">Completa tu pago</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* ── RESUMEN ─────────────────────────────────────────────── */}
          <div className="w-full md:w-[300px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              <div className="bg-slate-900 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Pedido</p>
                <p className="font-mono text-indigo-400 font-bold">{ID_ACTUAL}</p>
              </div>
              <div className="px-5 py-5 space-y-2.5 text-sm">

                {/* Subtotal original */}
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <div className="text-right">
                    {/* HU11: precio tachado si hay descuento */}
                    {hayDescuento && (
                      <span className="line-through text-slate-400 text-xs mr-1.5">
                        ${subtotalOriginal.toLocaleString("es-CO")}
                      </span>
                    )}
                    <span className="text-slate-800 font-medium">
                      ${subtotalConDescuento.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {/* Descuento automático */}
                {descuentoAuto > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/>
                      </svg>
                      Desc. automático
                    </span>
                    <span className="font-semibold text-xs">-${descuentoAuto.toLocaleString("es-CO")}</span>
                  </div>
                )}

                {/* Cupón aplicado */}
                {descuentoCupon > 0 && (
                  <div className="flex justify-between text-indigo-700">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/>
                      </svg>
                      Cupón {cuponAplicado?.codigo}
                    </span>
                    <span className="font-semibold text-xs">-${descuentoCupon.toLocaleString("es-CO")}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500">Envío ({ciudad})</span>
                  <span className="text-slate-800 font-medium">
                    {transporteSimulado === 0 ? "Gratis" : `$${transporteSimulado.toLocaleString("es-CO")}`}
                  </span>
                </div>
                {/* HU18: nombre técnico del impuesto visible para el cliente */}
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs leading-tight">
                    {NOMBRE_IMPUESTO[tipoImpuesto]}
                  </span>
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

          {/* ── FORMULARIO ──────────────────────────────────────────── */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* PASO 1: FORMULARIO */}
            {paso === 1 && (
              <div className="p-6 md:p-8">

                {/* HU11: Banner descuento automático activo */}
                {descuentoAuto > 0 && reglaAutoLabel && (
                  <div className="mb-6 flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800">{reglaAutoLabel}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Se ahorran <strong>${descuentoAuto.toLocaleString("es-CO")} COP</strong> automáticamente.</p>
                    </div>
                  </div>
                )}

                {/* Error banner */}
                {mensajeError && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 p-4">
                    <ErrorIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-800">Transaccion rechazada</p>
                      <p className="text-xs text-rose-700 mt-0.5">{mensajeError}</p>
                    </div>
                    <button onClick={() => setMensajeError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}

                {/* Aviso metodo asincrono */}
                {metodoPago !== "TARJETA" && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-indigo-50 border border-indigo-100 p-3.5 text-sm text-indigo-800">
                    <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Seras redirigido al portal de {metodoPago === "PSE" ? "tu banco" : metodoPago === "NEQUI" ? "Nequi" : "pago en efectivo"} para completar la transaccion.
                  </div>
                )}

                {/* Metodos */}
                <div className="mb-7">
                  <p className={labelCls}>Metodo de pago</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "TARJETA", label: "Tarjeta",  icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
                      { id: "PSE",     label: "PSE",      icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" },
                      { id: "NEQUI",   label: "Nequi",    icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" },
                      { id: "EFECTIVO",label: "Efectivo", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
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

                  {/* HU18: Ciudad de entrega → costo de envío según CalculadorEnvio */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Entrega y tipo de producto</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Ciudad de entrega</label>
                        <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputCls}>
                          <option value="Cali"     className="text-slate-900">Cali — Envío gratis</option>
                          <option value="Bogota"   className="text-slate-900">Bogotá — $15.000</option>
                          <option value="Medellin" className="text-slate-900">Medellín — $12.000</option>
                          <option value="Otra"     className="text-slate-900">Otra ciudad — $20.000</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Tarifa: ${transporteSimulado.toLocaleString("es-CO")} COP</p>
                      </div>
                      {/* HU17: Tipo de impuesto — lógica de CalculadorTasas del backend */}
                      <div>
                        <label className={labelCls}>Tipo de producto (IVA)</label>
                        <select
                          value={tipoImpuesto}
                          onChange={(e) => setTipoImpuesto(e.target.value as "GENERAL" | "REDUCIDO" | "EXENTO")}
                          className={inputCls}
                        >
                          <option value="REDUCIDO" className="text-slate-900">Reducido — 5% (alimentos, libros...)</option>
                          <option value="GENERAL"  className="text-slate-900">General — 19% (electrónica, ropa...)</option>
                          <option value="EXENTO"   className="text-slate-900">Exento — 0% (medicamentos, educación...)</option>
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

                  {/* ── HU14: CAMPO DE CUPÓN ──────────────────────────── */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Cupón de descuento</p>

                    {cuponAplicado ? (
                      // Cupón aplicado — mostrar badge con opción de quitar
                      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-black text-indigo-900 tracking-wider">{cuponAplicado.codigo}</p>
                            <p className="text-xs text-indigo-700">
                              -{" "}
                              <strong>${cuponAplicado.descuento.toLocaleString("es-CO")} COP</strong>
                              {cuponAplicado.descripcion && ` · ${cuponAplicado.descripcion}`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={quitarCupon}
                          className="text-xs text-slate-400 hover:text-rose-600 transition font-semibold px-2 py-1 rounded-lg hover:bg-rose-50"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      // Formulario para ingresar cupón
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

                    <p className="text-xs text-slate-400">
                      Prueba con:{" "}
                      <code className="bg-slate-200 px-1 rounded text-xs">BIENVENIDO10</code>{" "}
                      o{" "}
                      <code className="bg-slate-200 px-1 rounded text-xs">DESC20MIL</code>
                    </p>
                  </div>

                  {/* TARJETA */}
                  {metodoPago === "TARJETA" && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Titular de la tarjeta</label>
                        <input type="text" value={datosTarjeta.titular} onChange={(e) => setDatosTarjeta({ ...datosTarjeta, titular: e.target.value.toUpperCase() })} placeholder="NOMBRE APELLIDO" className={inputCls} />
                        <p className="text-xs text-slate-400 mt-1">Para errores de prueba usa: FUND, SECU o EXPI</p>
                      </div>
                      <div>
                        <label className={labelCls}>Numero de tarjeta</label>
                        <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} value={datosTarjeta.numero}
                          onChange={(e) => { const raw = e.target.value.replace(/\D/g,""); const fmt = raw.match(/.{1,4}/g)?.join(" ") || ""; setDatosTarjeta({ ...datosTarjeta, numero: fmt.slice(0,19) }); }}
                          className={inputCls} required />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className={labelCls}>Vencimiento</label>
                          <input type="text" placeholder="MM/AA" maxLength={5} value={datosTarjeta.fecha}
                            onChange={(e) => { let v = e.target.value.replace(/\D/g,"").slice(0,4); if(v.length>=3) v=v.slice(0,2)+"/"+v.slice(2); setDatosTarjeta({ ...datosTarjeta, fecha: v }); }}
                            className={inputCls} required />
                        </div>
                        <div className="col-span-1">
                          <label className={labelCls}>CVV</label>
                          <input type="password" placeholder="•••" maxLength={4} onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cvv: e.target.value })} className={inputCls} required />
                        </div>
                        <div className="col-span-1">
                          <label className={labelCls}>Cuotas</label>
                          <select value={datosTarjeta.cuotas} onChange={(e) => setDatosTarjeta({ ...datosTarjeta, cuotas: e.target.value })} className={inputCls}>
                            <option value="1" className="text-slate-900">1 cuota</option>
                            <option value="6" className="text-slate-900">6 cuotas</option>
                            <option value="12" className="text-slate-900">12 cuotas</option>
                            <option value="24" className="text-slate-900">24 cuotas</option>
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
                          <option value="natural" className="text-slate-900">Persona Natural</option>
                          <option value="juridica" className="text-slate-900">Persona Juridica</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Banco</label>
                        <select value={bancoPse} onChange={(e) => setBancoPse(e.target.value)} className={inputCls}>
                          <option value="" className="text-slate-900">Selecciona tu banco...</option>
                          <option value="1001" className="text-slate-900">Banco de Bogota</option>
                          <option value="1007" className="text-slate-900">Bancolombia</option>
                          <option value="1051" className="text-slate-900">Davivienda</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Numero de documento</label>
                        <input type="text" placeholder="CC o NIT" value={documentoPse} onChange={(e) => setDocumentoPse(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  )}

                  {/* NEQUI */}
                  {metodoPago === "NEQUI" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 text-white">
                        <span className="font-black text-sm tracking-wider">NEQUI</span>
                        <p className="text-xs text-slate-300">Recibirás una notificación push para aprobar el pago.</p>
                      </div>
                      <div>
                        <label className={labelCls}>Numero de celular Nequi</label>
                        <input type="text" placeholder="3000000000" value={telefonoNequi} onChange={(e) => setTelefonoNequi(e.target.value.replace(/\D/g,"").slice(0,10))} className={inputCls} />
                      </div>
                    </div>
                  )}

                  {/* EFECTIVO */}
                  {metodoPago === "EFECTIVO" && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">Elige el punto donde realizarás el pago. Generaremos un PIN de referencia.</p>
                      {[
                        { id: "efecty",  label: "Efecty",     sub: "9.000+ puntos en Colombia",   color: "#FFC300" },
                        { id: "baloto",  label: "Via Baloto",  sub: "13.000+ puntos en Colombia",  color: "#00A651" },
                      ].map((p) => (
                        <label key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${metodoEfectivo===p.id?"border-indigo-500 bg-indigo-50":"border-slate-200 hover:border-slate-300"}`}>
                          <input type="radio" name="efectivo" value={p.id} checked={metodoEfectivo===p.id} onChange={() => setMetodoEfectivo(p.id)} className="text-indigo-600" />
                          <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: p.color }} />
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{p.label}</p>
                            <p className="text-xs text-slate-500">{p.sub}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <button type="submit" className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition text-sm">
                    {metodoPago === "EFECTIVO" ? "Generar PIN de pago" : `Pagar $${totalReal.toLocaleString("es-CO")} COP`}
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
                      {metodoPago === "PSE" ? "Conectando con tu banco..." : metodoPago === "NEQUI" ? "Enviando notificacion..." : metodoPago === "EFECTIVO" ? "Generando recibo..." : "Procesando pago..."}
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
                      {metodoPago === "EFECTIVO" ? "Recibo generado — pendiente de pago" : metodoPago === "NEQUI" ? "Esperando tu aprobacion en Nequi" : "Esperando confirmacion del banco"}
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">Completa el pago en la pestana abierta y regresa aqui.</p>
                    <button onClick={verificarPagoPse} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-sm">
                      {metodoPago === "EFECTIVO" ? "Ya pague — Verificar" : "Ya pague — Verificar estado"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* PASO 3: RESULTADO */}
            {paso === 3 && (
              <div className="p-8">
                {metodoPago === "EFECTIVO" && pagoExitoso?.esAsincrono ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Casi listo</h2>
                    <p className="text-slate-500 text-sm mb-6">Acercate a un punto {metodoEfectivo === "efecty" ? "Efecty" : "Baloto"} con el siguiente codigo:</p>
                    {pagoExitoso?.codigoPago && (
                      <div className="inline-block bg-slate-900 rounded-2xl px-8 py-5 mb-6">
                        <p className="text-xs text-slate-400 mb-2">Codigo de referencia</p>
                        <p className="font-mono text-3xl font-black tracking-[0.2em] text-white">{pagoExitoso.codigoPago}</p>
                        <p className="text-xs text-slate-400 mt-2">{(pagoExitoso.puntoPago || metodoEfectivo).toUpperCase()} · Valido 48 horas</p>
                      </div>
                    )}
                    <ResumenCompra subtotal={subtotalConDescuento} transporte={transporteSimulado} iva={ivaSimulado} pct={porcentajeActual} total={totalReal} descuentos={totalDescuentos} />
                  </div>
                ) : pagoExitoso ? (
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
                        <div className="text-left">
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
                        <p className="text-xs text-slate-400 mb-1">ID de transaccion</p>
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
                ) : null}

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

function ResumenFila({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">${valor.toLocaleString("es-CO")}</span>
    </div>
  );
}

function ResumenCompra({ subtotal, transporte, iva, pct, total, descuentos }: { subtotal: number; transporte: number; iva: number; pct: number; total: number; descuentos: number }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-left mt-4">
      <p className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wide">Resumen del pago</p>
      <div className="space-y-1.5">
        <ResumenFila label="Subtotal" valor={subtotal} />
        {descuentos > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span className="text-xs font-medium">Descuentos aplicados</span>
            <span className="text-xs font-semibold">-${descuentos.toLocaleString("es-CO")}</span>
          </div>
        )}
        <ResumenFila label="Transporte" valor={transporte} />
        <ResumenFila label={`IVA (${pct}%)`} valor={iva} />
        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 mt-1">
          <span>Total pagado</span><span>${total.toLocaleString("es-CO")} COP</span>
        </div>
      </div>
    </div>
  );
}
