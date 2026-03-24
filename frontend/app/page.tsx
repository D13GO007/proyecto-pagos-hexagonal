"use client";
import { useState } from "react";

export default function Home() {
  const [precio, setPrecio] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState("");

  const calcular = async () => {
    setError("");
    setResultado(null);

    if (!precio) {
      setError("Ingrese un precio");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:3001/impuesto?precio=${precio}`
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResultado(data);
      }

    } catch (err) {
      setError("Error al conectar con el servidor");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Calcular IVA (HUO18)</h1>

      <input
        type="number"
        placeholder="Ingrese precio"
        value={precio}
        onChange={(e) => setPrecio(e.target.value)}
      />

      <br /><br />

      <button onClick={calcular}>Calcular</button>

      <br /><br />

      {error && <p style={{ color: "red" }}>{error}</p>}

      {resultado && (
        <div>
          <p>Precio: {resultado.precio}</p>
          <p>IVA: {resultado.iva}</p>
          <p>Total: {resultado.total}</p>
        </div>
      )}
    </div>
  );
}