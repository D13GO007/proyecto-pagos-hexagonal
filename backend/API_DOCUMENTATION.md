# API REST — Módulo de Pagos

URL base: `http://localhost:4000`

CORS habilitado para cualquier origen. Todos los endpoints aceptan y devuelven JSON.

---

## Pedidos

### POST /pedidos
Registra un pedido en el módulo de pagos. **Llamar desde el módulo de ventas/órdenes antes de redirigir al checkout.**

```json
{
  "pedidoId": "ORD-001",
  "totalFinal": 150000,
  "producto": "Laptop Pro X",
  "categoria": "Electronica",
  "clienteEmail": "cliente@correo.com"
}
```

- `pedidoId` y `totalFinal` son obligatorios.
- Si el pedido ya existe y está PENDIENTE, devuelve `{ ok: true }` sin sobreescribir.
- Si el pedido está CANCELADO, devuelve 400.

Respuesta exitosa:
```json
{ "ok": true, "pedidoId": "ORD-001" }
```

### GET /pedidos/:id
Consulta el estado de un pedido.

Respuesta:
```json
{
  "pedidoId": "ORD-001",
  "estado": "PENDIENTE | PAGADO | CANCELADO",
  "totalFinal": 150000,
  "transaccionId": "TXN-1234567890-123"
}
```

---

## Flujo de integración (paso a paso)

1. El módulo de ventas/órdenes llama `POST /pedidos` con los datos del pedido.
2. Redirige al comprador a la URL de checkout:

```
http://localhost:3000/pago?pedidoId=ORD-001&monto=150000&producto=Laptop+Pro+X&categoria=Electronica&email=cliente@correo.com
```

Parámetros de URL del checkout:

| Parámetro     | Requerido | Descripción                                      |
|---------------|-----------|--------------------------------------------------|
| `pedidoId`    | Sí        | ID del pedido registrado                         |
| `monto`       | Sí        | Subtotal del pedido en COP (sin IVA ni envío)    |
| `producto`    | No        | Nombre del producto (para descuentos automáticos)|
| `categoria`   | No        | Categoría (para descuentos automáticos)          |
| `email`       | No        | Email del comprador (pre-rellena el formulario)  |
| `tipoImpuesto`| No        | GENERAL / REDUCIDO / EXENTO (default: GENERAL)   |
| `ciudad`      | No        | Bogota / Cali / Medellin / Otra (default: Bogota)|

3. El módulo de pagos cobra al cliente y, al finalizar, puede consultar el estado con `GET /pedidos/:id`.

---

## Pagos

### POST /pagos
Procesa el pago de un pedido ya registrado.

```json
{
  "pedidoId": "ORD-001",
  "metodoPago": "TARJETA | PSE | NEQUI",
  "datosPago": {
    "numero": "4242 4242 4242 4242",
    "cvv": "123",
    "vencimiento": "12/27",
    "titular": "JUAN PEREZ",
    "cuotas": "1",
    "email": "cliente@correo.com"
  },
  "totalCobrado": 193500,
  "descuentoAplicado": 0,
  "cuponCodigo": "BIENVENIDO10",
  "clienteEmail": "cliente@correo.com",
  "subtotal": 150000,
  "transporte": 15000,
  "iva": 28500,
  "porcentajeIva": 19,
  "ciudad": "Bogota",
  "tipoImpuesto": "GENERAL"
}
```

Respuesta aprobado síncrono (tarjeta):
```json
{
  "aprobado": true,
  "exito": true,
  "mensaje": "Pago aprobado y pedido enviado a logística.",
  "transaccionId": "TXN-1234567890-123",
  "descuentoAplicado": 0
}
```

Respuesta aprobado asíncrono (PSE / NEQUI):
```json
{
  "aprobado": true,
  "esAsincrono": true,
  "mensaje": "Pago registrado en Wompi. Completa la aprobación para finalizar.",
  "transaccionId": "TXN-1234567890-123",
  "wompiTransaccionId": "12345-wompi-id",
  "linkPago": "https://checkout.wompi.co/..."
}
```

Respuesta rechazado:
```json
{ "message": "El pago fue rechazado por el banco.", "statusCode": 400 }
```

### GET /pagos/estado/:wompiTxId
Consulta el estado de una transacción PSE o NEQUI en Wompi (para polling).

```json
{ "aprobado": true, "estado": "APPROVED" }
```

### POST /pagos/notificar-estado
Notifica al vendedor un cambio de estado en una factura.

```json
{
  "facturaId": "FAC-123",
  "pedidoId": "ORD-001",
  "nuevoEstado": "REEMBOLSADA | ANULADA",
  "monto": 150000,
  "emailComprador": "cliente@correo.com"
}
```

---

## Cupones

### GET /cupones
Lista todos los cupones (panel del vendedor).

### POST /cupones
Crea un cupón nuevo.

```json
{
  "codigo": "PROMO20",
  "descripcion": "20% de descuento",
  "tipoDescuento": "porcentaje",
  "valorDescuento": 20,
  "montoMinimo": 80000,
  "maxUsos": 50,
  "fechaExpiracion": "2027-12-31T23:59:59"
}
```

### POST /cupones/validar
Valida un cupón en el checkout. Llamar antes de procesar el pago.

```json
{
  "codigo": "PROMO20",
  "monto": 150000,
  "clienteEmail": "cliente@correo.com"
}
```

Respuesta válido:
```json
{
  "valido": true,
  "descuentoAplicado": 30000,
  "cupon": { "codigo": "PROMO20", "descripcion": "...", "montoMinimo": 80000 }
}
```

### POST /cupones/aplicar
Marca el cupón como usado tras pago aprobado.

```json
{ "codigo": "PROMO20", "clienteEmail": "cliente@correo.com" }
```

---

## Devoluciones

### POST /devoluciones
Cliente solicita devolución o anulación → notifica al vendedor por correo.

```json
{
  "id": "SOL-001",
  "facturaId": "FAC-123",
  "pedidoId": "ORD-001",
  "emailComprador": "cliente@correo.com",
  "tipo": "DEVOLUCION | ANULACION",
  "motivo": "Producto dañado",
  "monto": 150000,
  "descripcion": "El producto llegó con la caja rota"
}
```

### POST /devoluciones/resolver
Vendedor aprueba o rechaza la solicitud → notifica al cliente.

```json
{
  "facturaId": "FAC-123",
  "pedidoId": "ORD-001",
  "emailComprador": "cliente@correo.com",
  "tipo": "DEVOLUCION",
  "decision": "APROBADA | RECHAZADA",
  "motivo": "Producto dañado",
  "motivoRechazo": "No aplica garantía",
  "monto": 150000
}
```

### POST /devoluciones/escalar
Cliente escala al administrador → notifica al admin.

```json
{
  "solicitudId": "SOL-001",
  "facturaId": "FAC-123",
  "pedidoId": "ORD-001",
  "emailComprador": "cliente@correo.com",
  "tipo": "DEVOLUCION",
  "motivo": "Producto dañado",
  "reclamacion": "El vendedor rechazó sin justificación",
  "monto": 150000
}
```

### POST /devoluciones/admin-resolver
Admin decide la resolución final → notifica a comprador y vendedor.

```json
{
  "facturaId": "FAC-123",
  "pedidoId": "ORD-001",
  "emailComprador": "cliente@correo.com",
  "tipo": "DEVOLUCION",
  "decision": "APROBADA | RECHAZADA",
  "adminMotivo": "Se aprueba la reclamación del comprador",
  "monto": 150000
}
```

---

## Tarjetas de prueba (Wompi Sandbox)

| Número               | Resultado  |
|----------------------|------------|
| 4242 4242 4242 4242  | Aprobada   |
| 4111 1111 1111 1112  | Declinada  |

CVV: `123` · Vencimiento: `12/27` · Cuotas: 1, 6, 12, 24

**Nequi**: `3991111111` → aprobado · `3991111112` → declinado

**PSE**: cualquier banco del selector + CC/NIT válido → redirige al simulador de Wompi
