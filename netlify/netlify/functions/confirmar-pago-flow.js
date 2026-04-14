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

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  var token = null;

  if (event.httpMethod === 'POST') {
    try { token = qs.parse(event.body).token; } catch(e){}
  } else {
    token = (event.queryStringParameters || {}).token;
  }

  if (!token) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Token requerido' }) };
  }

  try {
    var result = await flowGet('/payment/getStatus', {
      apiKey: API_KEY,
      token:  token
    });
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        status:      result.status,
        flowOrder:   result.commerceOrder,
        flowNumber:  result.flowOrder,
        amount:      result.amount,
        payer:       result.payer,
        subject:     result.subject,
        requestDate: result.requestDate
      })
    };
  } catch(err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
