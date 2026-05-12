const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();
const db = admin.firestore();

const RAZORPAY_API = 'https://api.razorpay.com/v1';

function getConfig() {
  const c = {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    planId: process.env.RAZORPAY_PLAN_ID,
  };
  if (!c.keyId || !c.keySecret) throw new Error('Razorpay keys not configured');
  return c;
}

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Razorpay-Signature');
}

async function rzpRequest(method, path, body, config) {
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');
  const res = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Razorpay ${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function hmacSha256Hex(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

exports.publishPage = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
      const { tpl, data, paymentId, orderId, signature, email, phone } = req.body || {};
      if (!tpl || !data || !paymentId || !orderId || !signature) {
        return res.status(400).send('Missing required fields');
      }

      const validTpls = ['love', 'proposal', 'quiz', 'slides', 'album', 'countdown'];
      if (!validTpls.includes(tpl)) return res.status(400).send('Invalid template');

      const config = getConfig();
      const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, config.keySecret);
      if (!timingSafeEqual(expected, signature)) {
        return res.status(401).send('Invalid payment signature');
      }

      const docRef = await db.collection('lovedigitally_pages').add({
        tpl,
        data,
        paymentId,
        orderId,
        createdAt: FieldValue.serverTimestamp(),
      });

      await db.collection('lovedigitally_orders').doc(orderId).set({
        status: 'fulfilled',
        pageId: docRef.id,
        email: email || null,
        phone: phone || null,
        fulfilledAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      res.json({ pageId: docRef.id });
    } catch (err) {
      console.error('publishPage error', err);
      res.status(500).send(err.message || 'Internal error');
    }
  });

exports.createOrder = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
      const { email, phone, amount = 900 } = req.body || {};
      if (!email || !phone) return res.status(400).send('email and phone required');

      const config = getConfig();

      const order = await rzpRequest('POST', '/orders', {
        amount,
        currency: 'INR',
        receipt: `lvdg_${Date.now()}`,
        notes: { email, phone, product: 'lovedigitally-premium' },
      }, config);

      await db.collection('lovedigitally_orders').doc(order.id).set({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        email,
        phone,
        createdAt: FieldValue.serverTimestamp(),
      });

      res.json({ orderId: order.id, keyId: config.keyId, amount: order.amount });
    } catch (err) {
      console.error('createOrder error', err);
      res.status(500).send(err.message || 'Internal error');
    }
  });

exports.verifyOrder = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
      const { orderId, paymentId, signature } = req.body || {};
      if (!orderId || !paymentId || !signature) {
        return res.status(400).send('Missing fields');
      }

      const config = getConfig();
      const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, config.keySecret);
      const ok = timingSafeEqual(expected, signature);

      if (ok) {
        await db.collection('lovedigitally_orders').doc(orderId).set({
          status: 'paid',
          paymentId,
          verifiedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      res.json({ valid: ok });
    } catch (err) {
      console.error('verifyOrder error', err);
      res.status(500).send(err.message || 'Internal error');
    }
  });

exports.createSubscription = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
      const { email, phone } = req.body || {};
      if (!email || !phone) return res.status(400).send('email and phone required');

      const config = getConfig();
      if (!config.planId) return res.status(500).send('RAZORPAY_PLAN_ID not configured');

      const subscription = await rzpRequest('POST', '/subscriptions', {
        plan_id: config.planId,
        total_count: 120,
        customer_notify: 1,
        notes: { email, phone },
      }, config);

      await db.collection('lovedigitally_subscriptions').doc(subscription.id).set({
        subscriptionId: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        email,
        phone,
        createdAt: FieldValue.serverTimestamp(),
      });

      res.json({ subscriptionId: subscription.id, keyId: config.keyId });
    } catch (err) {
      console.error('createSubscription error', err);
      res.status(500).send(err.message || 'Internal error');
    }
  });

exports.verifySubscription = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
      const { paymentId, subscriptionId, signature } = req.body || {};
      if (!paymentId || !subscriptionId || !signature) {
        return res.status(400).send('Missing fields');
      }

      const config = getConfig();
      const expected = await hmacSha256Hex(`${paymentId}|${subscriptionId}`, config.keySecret);
      const ok = timingSafeEqual(expected, signature);

      if (ok) {
        await db.collection('lovedigitally_subscriptions').doc(subscriptionId).set({
          status: 'authenticated',
          firstPaymentId: paymentId,
          verifiedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      res.json({ valid: ok });
    } catch (err) {
      console.error('verifySubscription error', err);
      res.status(500).send(err.message || 'Internal error');
    }
  });

exports.razorpayWebhook = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
      const config = getConfig();
      if (!config.webhookSecret) return res.status(500).send('Webhook secret not configured');

      const signature = req.headers['x-razorpay-signature'];
      if (!signature) return res.status(401).send('Missing signature');

      // req.rawBody is the unparsed Buffer Firebase Functions provides for HTTPS triggers
      const rawBody = req.rawBody.toString();
      const expected = await hmacSha256Hex(rawBody, config.webhookSecret);
      if (!timingSafeEqual(expected, signature)) return res.status(401).send('Invalid signature');

      const event = JSON.parse(rawBody);

      await db.collection('lovedigitally_webhook_events').add({
        eventType: event.event,
        eventId: event.id || null,
        payload: event.payload,
        receivedAt: FieldValue.serverTimestamp(),
      });

      const subId = event.payload?.subscription?.entity?.id;
      if (subId) {
        const update = { lastEventAt: FieldValue.serverTimestamp() };
        switch (event.event) {
          case 'subscription.activated': update.status = 'active'; break;
          case 'subscription.charged':
            update.status = 'active';
            update.lastChargedAt = FieldValue.serverTimestamp();
            break;
          case 'subscription.cancelled': update.status = 'cancelled'; break;
          case 'subscription.completed': update.status = 'completed'; break;
          case 'subscription.halted': update.status = 'halted'; break;
          case 'subscription.pending': update.status = 'pending'; break;
        }
        await db.collection('lovedigitally_subscriptions').doc(subId).set(update, { merge: true });
      }

      res.status(200).send('ok');
    } catch (err) {
      console.error('razorpayWebhook error', err);
      // Return 200 anyway — Razorpay retries on non-2xx, and we already logged
      res.status(200).send('ok');
    }
  });
