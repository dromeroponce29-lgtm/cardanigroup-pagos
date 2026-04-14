const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  // CORS headers (permite llamadas desde tu dominio Netlify)
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { amount, currency, service, email, name, rut } = body;

  // Validaciones
  if (!amount || !email || !name) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Faltan campos requeridos: amount, email, name' })
    };
  }

  // CLP no tiene decimales en Stripe (moneda de cero decimales)
  const amountInt = Math.round(Number(amount));

  if (amountInt < 50) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'El monto mínimo es $50 CLP' })
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:        amountInt,
      currency:      (currency || 'clp').toLowerCase(),
      receipt_email: email,
      description:   `CARDANIGROUP — ${service || 'Servicio profesional'}`,
      metadata: {
        empresa:  'CARDANIGROUP',
        servicio: service || '',
        cliente:  name,
        rut:      rut || '',
        email:    email
      },
      // Habilita métodos de pago automáticos según el país del cliente
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'  // solo pagos directos sin redirección
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };

  } catch(err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Error interno al procesar el pago' })
    };
  }
};
