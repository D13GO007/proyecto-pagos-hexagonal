# Módulo de Pagos — Documentación de APIs

**Versión 1.0 — Cloud Run**
**Actualización: Mayo 2026**
**Equipo de Ingeniería de Software — Grupo 4**
**Puerto 8080 | NestJS 11 | Node 18**

---

## Tabla de Contenidos

1. Arquitectura del Sistema
2. APIs que Expone el Módulo de Pagos
3. Integración con Otros Módulos
4. Configuración
5. Autenticación entre Módulos
6. Servicios Externos
7. Flujo de Compra
8. Estados del Sistema
9. Códigos de Error Estándar
10. Despliegue en Cloud Run

---

## 1. Arquitectura del Sistema

El módulo de pagos está diseñado para ejecutarse sobre Google Cloud Run usando arquitectura hexagonal (Ports & Adapters). El backend es NestJS y el frontend es Next.js, cada uno desplegado como un servicio independiente.

### 1.1 Diagrama de Arquitectura

```
Frontend Pagos (Cloud Run :8080 — Next.js standalone)
    │
    └── /pago?pedidoId=&monto=    → Formulario de pago (tarjeta, PSE, Nequi)
    └── /api-docs                 → Swagger UI (solo backend)

Backend Pagos (Cloud Run :8080 — NestJS)
    │
    ├── POST /checkout            → Recibe llamadas del módulo carrito
    ├── POST /reembolso           → Recibe solicitudes de reembolso del carrito
    ├── POST /pagos               → Procesa pago contra Wompi
    ├── GET  /pagos/estado/:id    → Consulta estado en Wompi (PSE / Nequi)
    ├── POST /pagos/notificar-estado → Notifica cambio de estado al vendedor
    ├── GET  /cupones             → Gestión de cupones (vendedor)
    ├── POST /devoluciones        → Flujo de devoluciones
    ├── POST /pedidos             → Registro de pedidos
    └── GET  /health              → Health check (Cloud Run)

    Servicios externos consumidos:
    ├── Wompi Sandbox API         → Procesamiento de pagos
    ├── Gmail SMTP                → Notificaciones por correo
    └── POST {CARRITO_SERVICE_URL}/api/carrito/pago-confirmado  → Webhook al carrito
```

### 1.2 Capas de la Arquitectura Hexagonal

| Capa | Responsabilidad | Ubicación |
|------|-----------------|-----------|
| Domain | Entidades, interfaces, puertos (contratos) | `backend/src/domain/` |
| Application | Casos de uso, orquestación de lógica | `backend/src/application/` |
| Infrastructure Inbound | Controllers REST (adaptadores de entrada) | `backend/src/infrastructure/adapters/inbound/` |
| Infrastructure Outbound | Wompi, Email, Carrito webhook (adaptadores de salida) | `backend/src/infrastructure/adapters/outbound/` |

---

## 2. APIs que Expone el Módulo de Pagos

### 2.1 Health Check

| Método y Ruta | Descripción |
|---------------|-------------|
| GET /health | Health check utilizado por Cloud Run. Retorna: `{ status: 'ok', timestamp, uptime }`. No requiere autenticación. |

### 2.2 Pagos (/pagos)

| Método y Ruta | Descripción |
|---------------|-------------|
| POST /pagos | Procesa un pago completo contra Wompi. Recibe los datos del formulario de pago (tarjeta, PSE o Nequi), valida el pedido, contacta la pasarela y retorna el resultado. Tras aprobación, notifica al carrito vía webhook y envía correos al comprador y vendedor. |
| GET /pagos/estado/:id | Consulta el estado en tiempo real de una transacción PSE o Nequi en Wompi. El `id` es el `wompiTransaccionId` retornado por POST /pagos. Usado para polling desde el frontend. |
| POST /pagos/notificar-estado | Notifica al vendedor por correo cuando el comprador anula o solicita reembolso de una factura ya emitida. |

**Body de POST /pagos:**
```json
{
  "pedidoId": "CART-12345",
  "totalCobrado": 150000,
  "metodoPago": "TARJETA",
  "datosPago": {
    "numero": "4242424242424242",
    "vencimiento": "12/27",
    "cvv": "123",
    "titular": "JUAN PEREZ",
    "cuotas": "1",
    "email": "comprador@ejemplo.com"
  },
  "subtotal": 120000,
  "transporte": 10000,
  "iva": 20000,
  "porcentajeIva": 19,
  "descuentoAplicado": 0,
  "cuponCodigo": "DESCUENTO10",
  "clienteEmail": "comprador@ejemplo.com"
}
```

**Respuesta exitosa (tarjeta síncrona):**
```json
{
  "aprobado": true,
  "exito": true,
  "mensaje": "Pago aprobado y pedido enviado a logística.",
  "transaccionId": "TXN-1716000000000-482",
  "descuentoAplicado": 0
}
```

**Respuesta exitosa (PSE / Nequi asíncrono):**
```json
{
  "aprobado": true,
  "exito": true,
  "esAsincrono": true,
  "mensaje": "Pago registrado en Wompi. Completa la aprobación para finalizar.",
  "linkPago": "https://wompi.co/redirect/pse/...",
  "transaccionId": "TXN-1716000000000-482",
  "wompiTransaccionId": "123456-abcd-efgh"
}
```

**Body de POST /pagos (PSE):**
```json
{
  "pedidoId": "CART-12345",
  "totalCobrado": 150000,
  "metodoPago": "PSE",
  "datosPago": {
    "email": "comprador@ejemplo.com",
    "bancoPse": "1007",
    "documentoPse": "1234567890",
    "tipoPersona": "natural"
  }
}
```

**Body de POST /pagos (Nequi):**
```json
{
  "pedidoId": "CART-12345",
  "totalCobrado": 150000,
  "metodoPago": "NEQUI",
  "datosPago": {
    "email": "comprador@ejemplo.com",
    "telefonoNequi": "3991111111"
  }
}
```

**Body de POST /pagos/notificar-estado:**
```json
{
  "facturaId": "FAC-001",
  "pedidoId": "CART-12345",
  "nuevoEstado": "ANULADO",
  "monto": 150000,
  "emailComprador": "comprador@ejemplo.com"
}
```

### 2.3 Cupones (/cupones)

| Método y Ruta | Descripción |
|---------------|-------------|
| GET /cupones | Lista todos los cupones del vendedor. Retorna: `[{ codigo, descripcion, tipoDescuento, valorDescuento, usosActuales, maxUsos, activo, fechaExpiracion }]`. |
| POST /cupones | Crea un nuevo cupón de descuento. |
| POST /cupones/validar | Valida un código de cupón en el checkout. Verifica vigencia, usos restantes, monto mínimo y si el cliente ya lo usó. |
| POST /cupones/aplicar | Marca un cupón como usado tras pago exitoso. Llamado internamente por el frontend tras confirmación. |

**Body de POST /cupones:**
```json
{
  "codigo": "PROMO20",
  "descripcion": "20% de descuento en tu primera compra",
  "tipoDescuento": "porcentaje",
  "valorDescuento": 20,
  "montoMinimo": 50000,
  "maxUsos": 100,
  "fechaExpiracion": "2026-12-31T23:59:59Z",
  "vendedorId": "VND-001"
}
```

**Body de POST /cupones/validar:**
```json
{
  "codigo": "PROMO20",
  "monto": 150000,
  "clienteEmail": "comprador@ejemplo.com"
}
```

**Respuesta de POST /cupones/validar (válido):**
```json
{
  "valido": true,
  "descuento": 30000,
  "motivo": null
}
```

**Respuesta de POST /cupones/validar (inválido):**
```json
{
  "valido": false,
  "descuento": 0,
  "motivo": "El cupón ya fue usado por este cliente."
}
```

### 2.4 Devoluciones (/devoluciones)

| Método y Ruta | Descripción |
|---------------|-------------|
| POST /devoluciones | Cliente crea una solicitud de devolución o anulación. Notifica al vendedor por correo. |
| POST /devoluciones/resolver | Vendedor aprueba o rechaza la solicitud. Notifica al cliente por correo. |
| POST /devoluciones/escalar | Cliente escala la disputa al administrador. Notifica al admin por correo. |
| POST /devoluciones/admin-resolver | Admin toma la decisión final. Notifica al comprador y al vendedor. |

**Body de POST /devoluciones:**
```json
{
  "id": "DEV-001",
  "facturaId": "FAC-001",
  "pedidoId": "CART-12345",
  "emailComprador": "comprador@ejemplo.com",
  "tipo": "DEVOLUCION",
  "motivo": "El producto llegó dañado",
  "monto": 150000,
  "descripcion": "La pantalla del producto estaba rota al abrir la caja"
}
```

*Nota: `tipo` acepta `"ANULACION"` (antes de envío) o `"DEVOLUCION"` (producto ya recibido).*

**Body de POST /devoluciones/resolver:**
```json
{
  "facturaId": "FAC-001",
  "pedidoId": "CART-12345",
  "emailComprador": "comprador@ejemplo.com",
  "tipo": "DEVOLUCION",
  "decision": "APROBADA",
  "motivo": "El cliente tiene razón",
  "monto": 150000
}
```

**Body de POST /devoluciones/escalar:**
```json
{
  "solicitudId": "DEV-001",
  "facturaId": "FAC-001",
  "pedidoId": "CART-12345",
  "emailComprador": "comprador@ejemplo.com",
  "tipo": "DEVOLUCION",
  "motivo": "El producto llegó dañado",
  "reclamacion": "El vendedor rechazó pero el producto claramente estaba roto",
  "monto": 150000
}
```

**Body de POST /devoluciones/admin-resolver:**
```json
{
  "facturaId": "FAC-001",
  "pedidoId": "CART-12345",
  "emailComprador": "comprador@ejemplo.com",
  "tipo": "DEVOLUCION",
  "decision": "APROBADA",
  "adminMotivo": "Evidencia fotográfica confirma daño en el producto",
  "monto": 150000
}
```

### 2.5 Pedidos (/pedidos)

| Método y Ruta | Descripción |
|---------------|-------------|
| POST /pedidos | Registra un pedido en el módulo de pagos antes de redirigir al checkout. Si el pedido ya existe, no lo duplica. |
| GET /pedidos/:id | Consulta el estado de un pedido. Retorna: `{ pedidoId, estado, totalFinal, transaccionId }`. |

**Body de POST /pedidos:**
```json
{
  "pedidoId": "CART-12345",
  "totalFinal": 150000,
  "producto": "Laptop Dell Inspiron",
  "categoria": "Electrónica",
  "clienteEmail": "comprador@ejemplo.com"
}
```

---

## 3. Integración con Otros Módulos

El módulo de pagos ofrece dos endpoints públicos protegidos con API key para que otros microservicios del e-commerce puedan consumirlos.

### 3.1 Endpoints de Integración

| Método y Ruta | Descripción |
|---------------|-------------|
| POST /checkout | El módulo carrito llama este endpoint para iniciar un pago. Retorna la URL a la que debe redirigir al usuario. Requiere header `x-api-key`. |
| POST /reembolso | El módulo carrito solicita un reembolso de una transacción ya procesada. Requiere header `x-api-key`. |

### 3.2 POST /checkout — Detalle

**Header requerido:**
```
x-api-key: <valor de PAGOS_API_KEY>
Content-Type: application/json
```

**Body:**
```json
{
  "transaccion_id": "CART-12345",
  "monto_total": 150000,
  "descripcion": "Laptop Dell Inspiron",
  "moneda": "COP",
  "items": []
}
```

**Respuesta:**
```json
{
  "redirect_url": "https://pagos-frontend-xxxxx-uc.a.run.app/pago?pedidoId=CART-12345&monto=150000&producto=Laptop+Dell+Inspiron&moneda=COP"
}
```

**Flujo:** El carrito redirige al usuario a `redirect_url`. El usuario completa el pago en el frontend de pagos. Tras aprobación, el backend de pagos envía automáticamente un webhook al carrito.

### 3.3 POST /reembolso — Detalle

**Header requerido:**
```
x-api-key: <valor de PAGOS_API_KEY>
```

**Body:**
```json
{
  "transaccionId": "TXN-1716000000000-482",
  "monto": 150000
}
```

**Respuesta:**
```json
{
  "ok": true,
  "transaccionId": "TXN-1716000000000-482",
  "monto": 150000,
  "mensaje": "Solicitud de reembolso recibida. El equipo de pagos la procesará."
}
```

### 3.4 Webhook de Pago Confirmado (Salida)

Tras un pago aprobado, el backend de pagos notifica automáticamente al carrito mediante un webhook HTTP.

**Destino:** `POST {CARRITO_SERVICE_URL}/api/carrito/pago-confirmado`

**Header enviado:**
```
x-webhook-signature: <HMAC-SHA256 del payload usando PAGOS_WEBHOOK_SECRET>
Content-Type: application/json
```

**Payload enviado:**
```json
{
  "referencia_pago_externa": "CART-12345",
  "estado": "APROBADA",
  "monto": 150000
}
```

**Generación de la firma:**
```
HMAC-SHA256(PAGOS_WEBHOOK_SECRET, JSON.stringify(payload))
```

El carrito debe verificar la firma usando el mismo `PAGOS_WEBHOOK_SECRET` para confirmar que el webhook proviene del módulo de pagos.

---

## 4. Configuración

Todas las variables de entorno se definen en `backend/.env.example`. El servicio valida al arrancar que las 7 variables obligatorias estén presentes; si alguna falta, el proceso termina con error.

### 4.1 Variables de Entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| PORT | No (default: 8080) | Puerto del servidor. Cloud Run lo asigna automáticamente. |
| WOMPI_PUBLIC_KEY | Sí | Llave pública de Wompi. Obtener en dashboard.wompi.co |
| WOMPI_PRIVATE_KEY | Sí | Llave privada de Wompi. |
| WOMPI_INTEGRITY_SECRET | Sí | Secreto para firmar transacciones con SHA-256. |
| EMAIL_USER | Sí | Correo Gmail para enviar notificaciones. |
| EMAIL_PASS | Sí | Contraseña de aplicación de Google (16 caracteres, no es la contraseña normal). |
| EMAIL_COMPRADOR | No | Correo de fallback para el comprador si no viene en el request. |
| EMAIL_VENDEDOR | No | Correo de fallback para el vendedor. |
| PAGOS_API_KEY | Sí | Clave compartida con el módulo carrito. Debe coincidir con `PAGOS_API_KEY` del carrito. |
| PAGOS_WEBHOOK_SECRET | Sí | Secreto HMAC-SHA256 para firmar webhooks hacia el carrito. Debe coincidir con `PAGOS_WEBHOOK_SECRET` del carrito. |
| CARRITO_SERVICE_URL | No | URL del microservicio carrito. Si no está configurada, el webhook de confirmación se omite con advertencia. |
| FRONTEND_URL | No (default: http://localhost:3000) | URL del frontend de pagos. Se usa en CORS y en la `redirect_url` retornada por POST /checkout. |
| ALLOWED_ORIGINS | No | Orígenes adicionales para CORS, separados por coma. Si no se define, solo se permite FRONTEND_URL. |

### 4.2 Variables Obligatorias al Arranque

La función `bootstrap()` verifica estas 7 variables antes de iniciar el servidor:

1. WOMPI_PUBLIC_KEY
2. WOMPI_PRIVATE_KEY
3. WOMPI_INTEGRITY_SECRET
4. EMAIL_USER
5. EMAIL_PASS
6. PAGOS_API_KEY
7. PAGOS_WEBHOOK_SECRET

---

## 5. Autenticación entre Módulos

La comunicación entre microservicios usa API key, no JWT. El header `x-api-key` debe incluirse en cada llamada a POST /checkout y POST /reembolso.

```
x-api-key: clave-secreta-pagos-equipo4
```

Si la variable `PAGOS_API_KEY` no está configurada en el backend, la validación se omite (comportamiento para desarrollo local). En producción siempre debe estar definida.

**Respuesta si la key es inválida:**
```json
HTTP 401
{ "error": "API key inválida" }
```

Los webhooks salientes hacia el carrito usan firma HMAC-SHA256 en el header `x-webhook-signature` en lugar de API key (ver sección 3.4).

---

## 6. Servicios Externos

### 6.1 Wompi (Pasarela de Pago)

URL base (sandbox): `https://sandbox.wompi.co/v1`

| Función | Descripción |
|---------|-------------|
| Tarjeta crédito/débito | Flujo síncrono. Tokeniza la tarjeta y cobra en una sola llamada. Retorna aprobado o rechazado inmediatamente. |
| PSE | Flujo asíncrono. Crea la transacción y retorna URL del banco. El usuario completa el pago en el banco. El frontend hace polling a GET /pagos/estado/:id para conocer el resultado. |
| Nequi | Flujo asíncrono. Wompi envía una notificación push a la app de Nequi del usuario. No hay URL de redirección. El frontend hace polling igual que PSE. Número de prueba sandbox: `3991111111`. |

**Firma de integridad (SHA-256):**
```
SHA256(referencia + monto_en_centavos + "COP" + WOMPI_INTEGRITY_SECRET)
```

### 6.2 Email (Gmail SMTP)

Host: `smtp.gmail.com` | Puerto: `587` | Protocolo: STARTTLS

| Función | Descripción |
|---------|-------------|
| Confirmación al comprador | Se envía tras pago aprobado. Incluye resumen de la factura. |
| Notificación al vendedor | Se envía tras pago aprobado. Incluye detalle del pedido. |
| Cambio de estado | Se envía cuando el comprador anula o solicita reembolso. |
| Solicitud de devolución | Notifica al vendedor cuando el cliente abre una devolución. |
| Resolución al cliente | Notifica al comprador la decisión del vendedor. |
| Escalación a admin | Notifica al administrador cuando el cliente escala una disputa. |
| Decisión final | Notifica a comprador y vendedor la decisión del administrador. |

---

## 7. Flujo de Compra

### Flujo A — Integración con Carrito (producción)

```
Paso 1: Carrito registra el pedido en pagos (opcional pero recomendado)
   POST /pedidos { pedidoId, totalFinal, producto, clienteEmail }
   → { ok: true, pedidoId }

Paso 2: Carrito inicia el checkout
   POST /checkout { transaccion_id, monto_total, descripcion, moneda }
   Header: x-api-key: <PAGOS_API_KEY>
   → { redirect_url: "https://pagos-frontend.run.app/pago?pedidoId=...&monto=..." }

Paso 3: Carrito redirige al usuario a redirect_url

Paso 4: Usuario completa el pago en el frontend de pagos
   POST /pagos { pedidoId, totalCobrado, metodoPago, datosPago, ... }
   → { aprobado: true, transaccionId, ... }

Paso 5 (automático): Backend de pagos notifica al carrito
   POST {CARRITO_SERVICE_URL}/api/carrito/pago-confirmado
   Header: x-webhook-signature: <HMAC-SHA256>
   Body: { referencia_pago_externa, estado: "APROBADA", monto }

Paso 6 (PSE / Nequi únicamente): Frontend hace polling mientras espera
   GET /pagos/estado/:wompiTransaccionId
   → { aprobado: true/false, estado: "APPROVED/PENDING/DECLINED" }
```

### Flujo B — Devoluciones

```
Paso 1: Cliente abre solicitud
   POST /devoluciones { facturaId, pedidoId, emailComprador, tipo, motivo, monto }
   → Vendedor recibe correo con la solicitud

Paso 2: Vendedor resuelve
   POST /devoluciones/resolver { facturaId, decision: "APROBADA"|"RECHAZADA", ... }
   → Cliente recibe correo con la decisión

Paso 3 (si rechazada): Cliente escala
   POST /devoluciones/escalar { solicitudId, reclamacion, ... }
   → Admin recibe correo con la disputa

Paso 4: Admin resuelve
   POST /devoluciones/admin-resolver { decision, adminMotivo, ... }
   → Comprador y vendedor reciben correo con la decisión final
```

---

## 8. Estados del Sistema

### 8.1 Estados de Pedidos

| Estado | Descripción |
|--------|-------------|
| PENDIENTE | Pedido registrado, esperando confirmación de pago. |
| PAGADO | Pago aprobado por Wompi de forma síncrona (tarjeta). |
| CANCELADO | Pedido cancelado. No admite más intentos de pago. |

*Nota: Los pedidos PSE y Nequi quedan en `PENDIENTE` hasta que el webhook o el polling confirman el pago en Wompi.*

### 8.2 Estados de Transacciones Wompi

| Estado | Descripción |
|--------|-------------|
| APPROVED | Pago completado exitosamente. |
| PENDING | Pago en proceso (esperando acción del usuario en PSE/Nequi). |
| DECLINED | Pago rechazado por la pasarela o el banco. |
| VOIDED | Transacción anulada. |
| ERROR | Error en la pasarela. |

### 8.3 Estados de Solicitudes de Devolución

| Estado / Tipo | Descripción |
|---------------|-------------|
| ANULACION | El comprador cancela antes de recibir el producto. |
| DEVOLUCION | El comprador devuelve el producto ya recibido. |
| APROBADA | El vendedor o admin aprobó la solicitud. |
| RECHAZADA | El vendedor o admin rechazó la solicitud. |

### 8.4 Estados de Cupones

| Estado | Descripción |
|--------|-------------|
| activo: true | El cupón puede ser validado y aplicado. |
| activo: false | El cupón fue desactivado o expiró. |
| usosActuales >= maxUsos | El cupón agotó su límite de usos aunque esté activo. |

---

## 9. Códigos de Error Estándar

| Código HTTP | Descripción |
|-------------|-------------|
| 200 | `{ ... }` — Éxito. |
| 201 | `{ message, data? }` — Recurso creado. |
| 400 | `{ message: 'Mensaje descriptivo' }` — Error de validación, pedido cancelado o pago rechazado. |
| 401 | `{ error: 'API key inválida' }` — Header `x-api-key` ausente o incorrecto. |
| 404 | `{ message: 'Pedido no encontrado.' }` — El recurso solicitado no existe. |
| 500 | `{ message: 'Error al consultar estado en Wompi' }` — Error inesperado del servidor. |

**Errores de validación de pago (HTTP 400):**

| Mensaje | Causa |
|---------|-------|
| `"2. Pedido Inexistente."` | El `pedidoId` no existe en el módulo de pagos. Llamar primero a POST /pedidos. |
| `"El producto no puede estar previamente pagado."` | El pedido ya fue pagado. |
| `"5. El pedido ha sido cancelado y no admite más transacciones."` | El pedido está en estado CANCELADO. |
| `"El cupón indicado no existe."` | El código de cupón no está registrado. |
| `"Cupón inválido: ..."` | El cupón existe pero no aplica (expirado, agotado, monto insuficiente, ya usado por este cliente). |
| `"Tu tarjeta no tiene fondos suficientes..."` | Rechazo por fondos (Wompi: `cc_rejected_insufficient_amount`). |
| `"El código de seguridad es incorrecto."` | CVV incorrecto (Wompi: `cc_rejected_bad_filled_security_code`). |

---

## 10. Despliegue en Cloud Run

Cada servicio (backend y frontend) se despliega de forma independiente como un servicio de Cloud Run.

### 10.1 Backend

```bash
gcloud run deploy pagos-backend \
  --source ./backend \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="\
    PORT=8080,\
    WOMPI_PUBLIC_KEY=pub_test_...,\
    WOMPI_PRIVATE_KEY=prv_test_...,\
    WOMPI_INTEGRITY_SECRET=test_integrity_...,\
    EMAIL_USER=tu-correo@gmail.com,\
    EMAIL_PASS=xxxx-xxxx-xxxx-xxxx,\
    PAGOS_API_KEY=clave-secreta-pagos-equipo4,\
    PAGOS_WEBHOOK_SECRET=secreto-compartido-con-carrito,\
    CARRITO_SERVICE_URL=https://carrito-srv-xxxxx-uc.a.run.app,\
    FRONTEND_URL=https://pagos-frontend-xxxxx-uc.a.run.app,\
    ALLOWED_ORIGINS=https://pagos-frontend-xxxxx-uc.a.run.app"
```

### 10.2 Frontend

El frontend es una aplicación Next.js compilada en modo `standalone`. La variable `NEXT_PUBLIC_BACKEND_URL` debe pasarse en tiempo de build.

```bash
gcloud run deploy pagos-frontend \
  --source ./frontend \
  --region=us-central1 \
  --allow-unauthenticated \
  --build-env-vars="NEXT_PUBLIC_BACKEND_URL=https://pagos-backend-xxxxx-uc.a.run.app"
```

### 10.3 Health Check

Cloud Run usa el endpoint `GET /health` para verificar que el servicio está vivo. El Dockerfile del backend incluye un `HEALTHCHECK` que consulta este endpoint cada 30 segundos.

```
GET /health
→ { "status": "ok", "timestamp": "2026-05-22T10:00:00.000Z", "uptime": 3600.5 }
```

### 10.4 Coordinación con el Módulo Carrito

Para que la integración funcione correctamente, el equipo del carrito debe configurar en su servicio:

| Variable en el carrito | Valor |
|------------------------|-------|
| `PAGOS_SERVICE_URL` | URL del backend de pagos en Cloud Run |
| `PAGOS_API_KEY` | El mismo valor que `PAGOS_API_KEY` del módulo de pagos |
| `PAGOS_WEBHOOK_SECRET` | El mismo valor que `PAGOS_WEBHOOK_SECRET` del módulo de pagos |

---

## Referencias

- Wompi Sandbox. (2026). Documentación de la API. https://docs.wompi.co
- NestJS. (2026). NestJS Documentation. https://docs.nestjs.com
- Google Cloud Run. (2026). Deploying containerized applications. https://cloud.google.com/run/docs
- Node.js Foundation. (2026). Node.js v18 documentation. https://nodejs.org/docs/latest-v18.x/api/

---

*Módulo de Pagos — Cloud Run v1.0 — Grupo 4*
