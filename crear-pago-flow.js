const crypto = require('crypto');
const https  = require('https');
const qs     = require('querystring');

const API_KEY    = process.env.FLOW_API_KEY;
const SECRET_KEY = process.env.FLOW_SECRET_KEY;
const API_URL    = 'https://www.flow.cl/api';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function sign(params) {
  var keys = Object.keys(params).sort();
  var str  = keys.map(function(k){ return k + params[k]; }).join('');
  return crypto.createHmac('sha256', SECRET_KEY).update(str).digest('hex');
}

function flowPost(endpoint, params) {
  return new Promise(function(resolve, reject) {
    params.s   = sign(params);
    var body   = qs.stringify(params);
    var parsed = new URL(API_URL + endpoint);
    var options = {
      hostname: parsed.hostname,
      path:     parsed.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(c){ data += c; });
      res.on('end', function(){
        try { resolve(JSON.parse(data)); }
        catch(e){ reject(new Error('Flow respuesta invalida: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Metodo no permitido' }) };

  if (!API_KEY || !SECRET_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Variables FLOW_API_KEY y FLOW_SECRET_KEY no configuradas' }) };
  }

  var body;
  try { body = JSON.parse(event.body); }
  catch(e){ return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'JSON invalido' }) }; }

  var amount  = body.amount;
  var service = body.service || 'Servicio profesional';
  var email   = body.email;
  var name    = body.name;

  if (!amount || !email || !name) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Faltan campos: amount, email, name' }) };
  }

  var host  = process.env.URL || ('https://' + (event.headers['host'] || 'localhost'));
  var order = 'CG-' + Date.now();

  var params = {
    apiKey:          API_KEY,
    commerceOrder:   order,
    subject:         'CARDANIGROUP - ' + service,
    currency:        'CLP',
    amount:          String(Math.round(Number(amount))),
    email:           email,
    paymentMethod:   '9',
    urlConfirmation: host + '/.netlify/functions/confirmar-pago-flow',
    urlReturn:       host + '/pago.html'
  };

  try {
    var result = await flowPost('/payment/create', params);
    if (result.url && result.token) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          url:       result.url + '?token=' + result.token,
          flowOrder: order,
          token:     result.token
        })
      };
    }
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: result.message || 'Flow no devolvio URL de pago' }) };
  } catch(err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
