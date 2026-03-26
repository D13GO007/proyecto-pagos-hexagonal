"use client";

import { useState } from "react";

/* =========================
LÓGICA (TU APORTE)
========================= */

function calcularTotal(precio: number, ubicacion: string) {
const IVA_RATE = 0.19;

const iva = precio * IVA_RATE;

let envio = 0;
if (ubicacion === "cali") envio = 10000;
else if (ubicacion === "bogota") envio = 15000;
else envio = 20000;

const total = precio + iva + envio;

return { precio, iva, envio, total };
}

export default function PasarelaPagoRealista() {
  const [metodo, setMetodo] = useState("tarjeta");
  const [paso, setPaso] = useState(1); // 1: Formulario, 2: Procesando, 3: Éxito/Ticket

  // Estados para capturar datos
  const [datosTarjeta, setDatosTarjeta] = useState({ titular: "", numero: "", fecha: "", cvv: "", cuotas: "1" });
  const [datosPSE, setDatosPSE] = useState({ banco: "", tipoPersona: "natural", documento: "" });
  const [telefonoNequi, setTelefonoNequi] = useState("");
  const [metodoEfectivo, setMetodoEfectivo] = useState("efecty");
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);

  const bancosColombia = ["Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA", "Banco de Occidente", "Caja Social"];

/* =========================
LÓGICA INTEGRADA
========================= */
const precioBase = 150000;
const ubicacion = "cali";
const resumen = calcularTotal(precioBase, ubicacion);

  const simularPago = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas según el método
    if (metodo === "tarjeta" && (!datosTarjeta.numero || !datosTarjeta.cvv)) return alert("Completa los datos de la tarjeta");
    if (metodo === "pse" && (!datosPSE.banco || !datosPSE.documento)) return alert("Selecciona tu banco y documento para PSE");
    if (metodo === "nequi" && telefonoNequi.length < 10) return alert("Ingresa un número de celular válido");

    setPaso(2); // Pantalla de carga (Procesando...)

    try {
      // AQUÍ OCURRE LA MAGIA: Enviamos los datos a tu backend de NestJS
      const respuesta = await fetch("http://localhost:4000/api/pagos/procesar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo: metodo,
          monto: resumen.total, // El monto que definimos en el resumen
          guardarMetodo: guardarTarjeta, // <-- AQUÍ ENVIAMOS LA DECISIÓN
          detalles: 
            metodo === "tarjeta" ? datosTarjeta : 
            metodo === "pse" ? datosPSE : 
            metodo === "nequi" ? { telefono: telefonoNequi } : { punto: metodoEfectivo }
        }),
      });

      const resultado = await respuesta.json();
      console.log("¡Respuesta oficial del backend!", resultado);

      if (resultado.exito) {
        setPaso(3); // Mostramos el ticket de éxito
      } else {
        alert("El backend rechazó el pago.");
        setPaso(1);
      }
    } catch (error) {
      console.error("Error conectando con el backend:", error);
      alert("Error de conexión con el servidor. ¿Está encendido el backend?");
      setPaso(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* Resumen de la compra (Lateral izquierdo) */}
        <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-4 mb-4">Resumen de Compra</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between"><span>Subtotal:</span> <span>${resumen.precio.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Envío:</span> <span>${resumen.envio.toLocaleString()}</span></div>
            <div className="flex justify-between">
              <span>IVA (19%):</span>
              <span>${resumen.iva.toLocaleString()}</span>
              </div>
            <div className="flex justify-between text-green-600"><span>Descuento:</span> <span>-$0</span></div>
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-3 mt-3">
              <span>Total a pagar:</span> <span>${resumen.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Pasarela de Pagos (Derecha) */}
        <div className="w-full md:w-2/3 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
          
          {paso === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-6">Elige tu medio de pago</h2>
              
              {/* Navegación de métodos de pago con SVGs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                
                {/* Botón Tarjeta */}
                <button onClick={() => setMetodo("tarjeta")} className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${metodo === "tarjeta" ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 mb-1">
                    <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                    <path fillRule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm-1.5 3a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                  </svg>
                  Tarjeta
                </button>

                {/* Botón PSE */}
                <button onClick={() => setMetodo("pse")} className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${metodo === "pse" ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                  <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 mb-1">
                    <circle cx="20" cy="20" r="14" fill="#00A1E4"/>
                    <text x="45" y="28" fill="#00A1E4" fontSize="26" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="-1">pse</text>
                  </svg>
                  PSE
                </button>

                {/* Botón Nequi */}
                <button onClick={() => setMetodo("nequi")} className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${metodo === "nequi" ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                  <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 mb-1">
                    <rect width="100" height="34" y="3" rx="8" fill="#1b113e"/>
                    <text x="50" y="26" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif" textAnchor="middle" letterSpacing="1">NEQUI</text>
                  </svg>
                  Nequi
                </button>

                {/* Botón Efectivo */}
                <button onClick={() => setMetodo("efectivo")} className={`p-3 border rounded-lg flex flex-col items-center justify-center gap-2 transition-all ${metodo === "efectivo" ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-600 mb-1">
                    <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                    <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" />
                  </svg>
                  Efectivo
                </button>
              </div>

              <form onSubmit={simularPago}>
                
                {/* FORMULARIO: TARJETA DE CRÉDITO/DÉBITO */}
                {metodo === "tarjeta" && (
                  <div className="space-y-4 animate-fade-in text-gray-800">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Número de la tarjeta</label>
                      <input type="text" placeholder="0000 0000 0000 0000" maxLength={16} onChange={(e) => setDatosTarjeta({...datosTarjeta, numero: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Nombre del titular</label>
                        <input type="text" placeholder="Como aparece en la tarjeta" onChange={(e) => setDatosTarjeta({...datosTarjeta, titular: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Cuotas</label>
                        <select onChange={(e) => setDatosTarjeta({...datosTarjeta, cuotas: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="1">1 Cuota</option>
                          <option value="6">6 Cuotas</option>
                          <option value="12">12 Cuotas</option>
                          <option value="24">24 Cuotas</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Vencimiento</label>
                        <input type="text" placeholder="MM/AA" maxLength={5} onChange={(e) => setDatosTarjeta({...datosTarjeta, fecha: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">CVV</label>
                        <input type="password" placeholder="123" maxLength={4} onChange={(e) => setDatosTarjeta({...datosTarjeta, cvv: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                      </div>
                    </div>
                    {/* CHECKBOX DE SEGURIDAD PARA GUARDAR TARJETA */}
                    <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <input 
                        type="checkbox" 
                        id="guardar" 
                        checked={guardarTarjeta}
                        onChange={(e) => setGuardarTarjeta(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="guardar" className="text-sm text-blue-800 cursor-pointer select-none">
                        Guardar esta tarjeta de forma segura para futuras compras
                      </label>
                    </div>
                  </div>
                )}

                {/* FORMULARIO: PSE */}
                {metodo === "pse" && (
                  <div className="space-y-4 animate-fade-in text-gray-800">
                    <p className="text-sm text-gray-500 mb-4">Serás redirigido a la plataforma segura de tu banco al continuar.</p>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tipo de Persona</label>
                      <select onChange={(e) => setDatosPSE({...datosPSE, tipoPersona: e.target.value})} className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="natural">Persona Natural</option>
                        <option value="juridica">Persona Jurídica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Banco</label>
                      <select onChange={(e) => setDatosPSE({...datosPSE, banco: e.target.value})} className="w-full border p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500" required>
                        <option value="">Selecciona tu banco...</option>
                        {bancosColombia.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Número de Documento (CC / NIT)</label>
                      <input type="number" placeholder="Ej. 1000200300" onChange={(e) => setDatosPSE({...datosPSE, documento: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                  </div>
                )}

                {/* FORMULARIO: NEQUI */}
                {metodo === "nequi" && (
                  <div className="space-y-4 animate-fade-in text-gray-800">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4 flex items-center gap-4">
                      <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-20">
                        <rect width="100" height="34" y="3" rx="8" fill="#1b113e"/>
                        <text x="50" y="26" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif" textAnchor="middle" letterSpacing="1">NEQUI</text>
                      </svg>
                      <p className="text-sm text-purple-800">Te enviaremos una notificación a tu app para que apruebes el pago.</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Número de celular Nequi</label>
                      <input type="number" placeholder="300 000 0000" onChange={(e) => setTelefonoNequi(e.target.value)} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" required />
                    </div>
                  </div>
                )}

                {/* FORMULARIO: EFECTIVO (EFECTY/BALOTO) */}
                {metodo === "efectivo" && (
                  <div className="space-y-4 animate-fade-in text-gray-800">
                    <p className="text-sm text-gray-500 mb-4">Selecciona dónde quieres pagar. Te generaremos un PIN para que te acerques a un punto físico.</p>
                    <div className="flex gap-4">
                      <label className={`flex-1 border p-4 rounded-lg cursor-pointer flex items-center gap-2 ${metodoEfectivo === "efecty" ? "border-yellow-500 bg-yellow-50" : "border-gray-200"}`}>
                        <input type="radio" name="punto_pago" value="efecty" checked={metodoEfectivo === "efecty"} onChange={() => setMetodoEfectivo("efecty")} className="w-4 h-4 text-yellow-600" />
                        <span className="font-bold text-blue-900 tracking-wide">Efecty</span>
                      </label>
                      <label className={`flex-1 border p-4 rounded-lg cursor-pointer flex items-center gap-2 ${metodoEfectivo === "baloto" ? "border-yellow-500 bg-yellow-50" : "border-gray-200"}`}>
                        <input type="radio" name="punto_pago" value="baloto" checked={metodoEfectivo === "baloto"} onChange={() => setMetodoEfectivo("baloto")} className="w-4 h-4 text-yellow-600" />
                        <span className="font-bold text-yellow-600 tracking-wide">BALOTO</span>
                      </label>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full mt-8 bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-lg">
                  {metodo === "efectivo" ? "Generar PIN de Pago" : "Pagar $162,500"}
                </button>
              </form>
            </>
          )}

          {/* PANTALLA 2: PROCESANDO */}
          {paso === 2 && (
            <div className="h-64 flex flex-col items-center justify-center animate-fade-in">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold text-gray-800">
                {metodo === "pse" ? "Conectando con tu banco..." : metodo === "nequi" ? "Esperando confirmación en la app..." : "Procesando pago..."}
              </h2>
              <p className="text-gray-500 text-sm mt-2">Por favor no cierres esta ventana.</p>
            </div>
          )}

          {/* PANTALLA 3: ÉXITO / TICKET DE EFECTIVO */}
          {paso === 3 && (
            <div className="text-center animate-fade-in py-8 text-gray-800">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl text-green-600">✓</span>
              </div>
              
              {metodo === "efectivo" ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Casi listo!</h2>
                  <p className="text-gray-600 mb-8">Acércate a cualquier punto {metodoEfectivo === "efecty" ? "Efecty" : "Baloto"} con los siguientes datos:</p>
                  <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 mx-auto max-w-sm">
                    <p className="text-sm text-gray-500">Convenio</p>
                    <p className="text-xl font-bold mb-4">112233</p>
                    <p className="text-sm text-gray-500">PIN de pago</p>
                    <p className="text-3xl font-bold tracking-widest text-black mb-4">987456321</p>
                    <p className="text-sm text-gray-500">Total a pagar: $162,500</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h2>
                  <p className="text-gray-600 mb-6">Tu transacción ha sido aprobada.</p>
                  <div className="bg-gray-50 p-4 rounded-lg text-left text-sm text-gray-600 inline-block">
                    <p><strong>Referencia:</strong> TX-{Math.floor(Math.random() * 1000000)}</p>
                    <p><strong>Método:</strong> {metodo.toUpperCase()}</p>
                    <p><strong>Total pagado:</strong> ${resumen.total.toLocaleString()}</p>
                  </div>
                </>
              )}
              
              <button onClick={() => setPaso(1)} className="mt-8 text-blue-600 font-semibold hover:underline">
                Volver al comercio
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}