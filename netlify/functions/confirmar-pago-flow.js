const crypto = require('crypto');
const https  = require('https');
const qs     = require('querystring');

const FLOW_API_KEY    = process.env.FLOW_API_KEY;
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY;
const FLOW_API_URL    = 'https://www.flow.cl/api';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function signParams(params) {
  var keys = Object.keys(params).sort();
  var toSign = keys.map(function(k){ return k + params[k]; }).join('');
  return crypto.createHmac('sha256', FLOW_SECRET_KEY).update(toSign).digest('hex');
}

function flowGet(endpoint, params) {
  return new Promise(function(resolve, reject) {
    params.s = signParams(params);
    var url = new URL(FLOW_API_URL + endpoint);
    Object.keys(params).forEach(function(k){ url.searchParams.append(k, params[k]); });

    https.get(url.toString(), function(res) {
      var data = '';
      res.on('data', function(c){ data += c; });
      res.on('end', function(){
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Respuesta inválida: ' + data)); }
      });
    }).on('error', reject);
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  // Flow llama a esta URL con POST (notificación server-to-server)
  // El cliente llama con GET (retorno desde Flow)
  var token = null;

  if (event.httpMethod === 'POST') {
    // Notificación de Flow (server-to-server)
    try {
      var bodyParams = qs.parse(event.body);
      token = bodyParams.token;
    } catch(e) {}
  } else {
    // Retorno del cliente o consulta GET
    token = (event.queryStringParameters || {}).token;
  }

  if (!token) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Token requerido' }) };
  }

  try {
    var result = await flowGet('/payment/getStatus', {
      apiKey: FLOW_API_KEY,
      token:  token
    });

    // status: 1=pendiente, 2=pagado, 3=rechazado, 4=anulado
    // Flow usa status=2 para pago exitoso
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        status:     result.status,
        flowOrder:  result.commerceOrder,
        flowNumber: result.flowOrder,
        amount:     result.amount,
        payer:      result.payer,
        subject:    result.subject,
        requestDate: result.requestDate
      })
    };
  } catch(err) {
    console.error('Flow confirmar error:', err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
