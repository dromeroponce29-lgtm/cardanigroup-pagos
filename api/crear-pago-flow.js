const crypto = require('crypto');
const https  = require('https');
const qs     = require('querystring');

const API_KEY    = process.env.FLOW_API_KEY;
const SECRET_KEY = process.env.FLOW_SECRET_KEY;
const API_URL    = 'https://www.flow.cl/api';

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

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Metodo no permitido' }); return; }

  if (!API_KEY || !SECRET_KEY) {
    res.status(500).json({ error: 'Variables FLOW_API_KEY y FLOW_SECRET_KEY no configuradas' });
    return;
  }

  var body = req.body;
  if (!body) {
    try {
      var raw = await new Promise(function(resolve, reject){
        var d = '';
        req.on('data', function(c){ d += c; });
        req.on('end', function(){ resolve(d); });
        req.on('error', reject);
      });
      body = JSON.parse(raw);
    } catch(e) {
      res.status(400).json({ error: 'JSON invalido' });
      return;
    }
  }

  var amount  = body.amount;
  var service = body.service || 'Servicio profesional';
  var email   = body.email;
  var name    = body.name;

  if (!amount || !email || !name) {
    res.status(400).json({ error: 'Faltan campos: amount, email, name' });
    return;
  }

  var host  = 'https://' + (req.headers['host'] || 'cardanigroup-pagos.vercel.app');
  var order = 'CG-' + Date.now();

  var params = {
    apiKey:          API_KEY,
    commerceOrder:   order,
    subject:         'CARDANIGROUP - ' + service,
    currency:        'CLP',
    amount:          String(Math.round(Number(amount))),
    email:           email,
    paymentMethod:   '1',,
    urlConfirmation: host + '/api/confirmar-pago-flow',
    urlReturn:       host + '/pago.html'
  };

  try {
    var result = await flowPost('/payment/create', params);
    if (result.url && result.token) {
      res.status(200).json({
        url:       result.url + '?token=' + result.token,
        flowOrder: order,
        token:     result.token
      });
    } else {
      res.status(400).json({ error: result.message || 'Flow no devolvio URL de pago' });
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
