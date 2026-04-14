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

function flowGet(endpoint, params) {
  return new Promise(function(resolve, reject) {
    params.s   = sign(params);
    var parsed = new URL(API_URL + endpoint);
    Object.keys(params).forEach(function(k){ parsed.searchParams.append(k, params[k]); });
    https.get(parsed.toString(), function(res) {
      var data = '';
      res.on('data', function(c){ data += c; });
      res.on('end', function(){
        try { resolve(JSON.parse(data)); }
        catch(e){ reject(new Error('Flow respuesta invalida: ' + data)); }
      });
    }).on('error', reject);
  });
}

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  var token = null;

  if (req.method === 'POST') {
    try {
      var raw = await new Promise(function(resolve, reject){
        var d = '';
        req.on('data', function(c){ d += c; });
        req.on('end', function(){ resolve(d); });
        req.on('error', reject);
      });
      token = qs.parse(raw).token;
    } catch(e){}
  } else {
    token = (req.query || {}).token;
  }

  if (!token) {
    res.status(400).json({ error: 'Token requerido' });
    return;
  }

  try {
    var result = await flowGet('/payment/getStatus', {
      apiKey: API_KEY,
      token:  token
    });
    res.status(200).json({
      status:      result.status,
      flowOrder:   result.commerceOrder,
      flowNumber:  result.flowOrder,
      amount:      result.amount,
      payer:       result.payer,
      subject:     result.subject,
      requestDate: result.requestDate
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
