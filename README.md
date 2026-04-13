[README.md](https://github.com/user-attachments/files/26691992/README.md)
# CARDANIGROUP — Módulo de Pago en Línea

## Estructura del proyecto

```
cardanigroup-pagos/
├── pago.html                          ← Página de pago completa
├── netlify.toml                       ← Configuración Netlify
└── netlify/
    └── functions/
        ├── crear-pago.js              ← Backend serverless (PaymentIntent)
        └── package.json               ← Dependencia Stripe
```

---

## Cómo desplegar en tu sitio Netlify

### 1. Agrega los archivos a tu repositorio

Copia todos estos archivos manteniendo la misma estructura de carpetas dentro de tu proyecto de sitio web.

### 2. Configura la variable de entorno en Netlify

Ve a: **app.netlify.com → tu sitio → Site configuration → Environment variables**

Agrega:
```
Key:   STRIPE_SECRET_KEY
Value: sk_test_51TLS0N2N7f...   (tu Secret Key desde dashboard.stripe.com → Developers → API keys)
```

> ⚠️  La Secret Key NUNCA va en el HTML. Solo en variables de entorno del servidor.

### 3. Despliega

Netlify detecta automáticamente el `netlify.toml` e instala las dependencias de las funciones.

---

## Tarjetas de prueba (modo test)

| Escenario         | Número               | Vencimiento | CVV |
|-------------------|----------------------|-------------|-----|
| Pago exitoso      | 4242 4242 4242 4242  | 12/34       | 123 |
| Fondos insuf.     | 4000 0000 0000 9995  | 12/34       | 123 |
| Tarjeta rechazada | 4000 0000 0000 0002  | 12/34       | 123 |

---

## Pasar a producción (cobros reales)

1. Verifica tu cuenta Stripe (datos empresa + cuenta bancaria chilena)
2. En el HTML, línea ~380: cambia `pk_test_...` → `pk_live_...`
3. En Netlify Environment variables: cambia `STRIPE_SECRET_KEY` → `sk_live_...`
4. Redespliega

---

## Servicios y precios configurados

| Servicio                    | Precio CLP  |
|-----------------------------|-------------|
| Auditoría Eléctrica Express | $450.000    |
| Consultoría ONAF/KNAF       | $1.200.000  |
| Curso ONAF/KNAF Online      | $180.000    |
| FMECA / Asset Integrity     | $800.000    |

Para modificar precios, edita los `data-price` en el HTML y las opciones del `<select>`.
