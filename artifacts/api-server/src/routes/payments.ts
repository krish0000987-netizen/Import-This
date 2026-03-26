import { Router } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

// In-memory payment store: rideId → payment record
export interface PaymentRecord {
  rideId: string;
  orderId: string;
  paymentId?: string;
  amount: number; // in paise
  status: "created" | "paid" | "failed";
  createdAt: Date;
  paidAt?: Date;
}

export const paymentStore = new Map<string, PaymentRecord>();

// Lazily load Razorpay so the server still boots without keys (test mode)
async function getRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  const { default: Razorpay } = await import("razorpay");
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

// POST /api/payments/create-order
router.post("/payments/create-order", async (req, res) => {
  const { rideId, amount, currency = "INR", receipt } = req.body as {
    rideId: string;
    amount: number;
    currency?: string;
    receipt?: string;
  };

  if (!rideId || !amount) {
    res.status(400).json({ error: "rideId and amount are required" });
    return;
  }

  // Prevent duplicate orders for same ride
  const existing = paymentStore.get(rideId);
  if (existing && existing.status === "paid") {
    res.status(409).json({ error: "Ride already paid", status: "paid" });
    return;
  }
  if (existing && existing.status === "created") {
    // Return existing order
    const noKeys = !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET;
    res.json({
      orderId: existing.orderId,
      amount: existing.amount,
      keyId: noKeys ? "rzp_test_DEMO" : RAZORPAY_KEY_ID,
      ...(noKeys ? { isDev: true } : {}),
    });
    return;
  }

  const razorpay = await getRazorpay();
  if (!razorpay) {
    // No keys — simulate order for development
    const mockOrderId = `order_DEV_${Date.now()}`;
    const amountPaise = Math.round(amount * 100);
    paymentStore.set(rideId, {
      rideId,
      orderId: mockOrderId,
      amount: amountPaise,
      status: "created",
      createdAt: new Date(),
    });
    logger.warn({ rideId }, "Razorpay keys not configured — returning mock order");
    res.json({ orderId: mockOrderId, amount: amountPaise, keyId: "rzp_test_DEMO", isDev: true });
    return;
  }

  try {
    const amountPaise = Math.round(amount * 100);
    const order = await (razorpay as any).orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt || rideId,
    });

    paymentStore.set(rideId, {
      rideId,
      orderId: order.id,
      amount: amountPaise,
      status: "created",
      createdAt: new Date(),
    });

    logger.info({ rideId, orderId: order.id, amountPaise }, "Razorpay order created");
    res.json({ orderId: order.id, amount: amountPaise, keyId: RAZORPAY_KEY_ID });
  } catch (err: any) {
    logger.error({ err: err.message, rideId }, "Failed to create Razorpay order");
    res.status(500).json({ error: "Failed to create payment order", details: err.message });
  }
});

// POST /api/payments/verify
router.post("/payments/verify", async (req, res) => {
  const { rideId, orderId, paymentId, signature } = req.body as {
    rideId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  };

  if (!rideId || !orderId || !paymentId) {
    res.status(400).json({ error: "rideId, orderId, paymentId are required" });
    return;
  }

  const record = paymentStore.get(rideId);
  if (!record) {
    res.status(404).json({ error: "No payment order found for this ride" });
    return;
  }
  if (record.status === "paid") {
    res.json({ success: true, alreadyPaid: true });
    return;
  }

  // Verify signature
  let isValid = false;
  if (!RAZORPAY_KEY_SECRET || record.orderId.startsWith("order_DEV_")) {
    // Dev mode — skip verification
    isValid = true;
    logger.warn({ rideId }, "Skipping signature verification in dev mode");
  } else {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    isValid = expectedSignature === signature;
  }

  if (!isValid) {
    logger.error({ rideId, orderId, paymentId }, "Payment signature verification failed");
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  // Mark as paid
  record.status = "paid";
  record.paymentId = paymentId;
  record.paidAt = new Date();
  paymentStore.set(rideId, record);

  logger.info({ rideId, orderId, paymentId }, "Payment verified successfully");
  res.json({ success: true });
});

// GET /api/payments/status/:rideId
router.get("/payments/status/:rideId", (req, res) => {
  const record = paymentStore.get(req.params.rideId);
  if (!record) {
    res.json({ status: "not_found" });
    return;
  }
  res.json({ status: record.status, orderId: record.orderId, paymentId: record.paymentId });
});

// GET /api/payments/checkout — Serves Razorpay Web Checkout HTML
router.get("/payments/checkout", (req, res) => {
  const { orderId, amount, key, rideId, name, email, phone, desc, isDev } = req.query as Record<string, string>;
  const amountRupees = Math.round(parseInt(amount || "0") / 100);
  const isDevMode = isDev === "1" || !key || key === "rzp_test_DEMO";

  const devModeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta charset="utf-8">
  <title>Safar Go — Test Payment</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0A0A0A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff;
    }
    .logo { width: 72px; height: 72px; border-radius: 22px; background: #C5A55A18; border: 1.5px solid #C5A55A40; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
    .logo svg { width: 40px; height: 40px; }
    .amount { font-size: 44px; font-weight: 800; color: #C5A55A; letter-spacing: -1px; }
    .title { font-size: 20px; font-weight: 700; color: #fff; margin: 8px 0 6px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 6px; text-align: center; line-height: 1.5; }
    .dev-badge {
      background: #F39C1220; border: 1px solid #F39C1240; border-radius: 20px;
      padding: 5px 14px; font-size: 12px; color: #F39C12; font-weight: 600;
      margin: 16px 0 28px; display: inline-flex; align-items: center; gap: 6px;
    }
    .card {
      width: 100%; max-width: 360px;
      background: #141414; border: 1px solid #242424;
      border-radius: 20px; padding: 24px;
    }
    .card-title { font-size: 13px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
    .method-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid #1e1e1e;
    }
    .method-row:last-child { border-bottom: none; }
    .method-icon { width: 36px; height: 36px; border-radius: 10px; background: #1e1e1e; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px; }
    .method-label { font-size: 14px; color: #bbb; }
    .method-sub { font-size: 12px; color: #555; margin-top: 2px; }
    .btn-success {
      display: block; width: 100%; max-width: 360px;
      margin-top: 20px; padding: 17px;
      background: linear-gradient(135deg, #C5A55A, #A8893A);
      border: none; border-radius: 14px; cursor: pointer;
      font-size: 16px; font-weight: 700; color: #0A0A0A;
      letter-spacing: 0.2px;
    }
    .btn-success:active { opacity: 0.85; transform: scale(0.98); }
    .btn-fail {
      display: block; width: 100%; max-width: 360px;
      margin-top: 10px; padding: 14px;
      background: transparent;
      border: 1px solid #E74C3C40; border-radius: 14px; cursor: pointer;
      font-size: 14px; font-weight: 600; color: #E74C3C;
    }
    .spinner { width: 36px; height: 36px; border: 3px solid #222; border-top-color: #C5A55A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 28px auto; display: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .processing { font-size: 14px; color: #888; text-align: center; display: none; }
  </style>
</head>
<body>
  <div class="logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="#C5A55A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <rect x="9" y="11" width="14" height="10" rx="2"/>
      <circle cx="12" cy="19" r="1"/><circle cx="20" cy="19" r="1"/>
    </svg>
  </div>

  <div class="amount">₹${amountRupees.toLocaleString("en-IN")}</div>
  <div class="title">Safar Go</div>
  <div class="subtitle">${(desc || "Ride Payment").replace(/</g, "&lt;")}</div>
  <div class="dev-badge">⚙ Test Mode — No real payment</div>

  <div class="card">
    <div class="card-title">Simulated payment methods</div>
    <div class="method-row">
      <div class="method-icon">💳</div>
      <div>
        <div class="method-label">UPI / Cards / Net Banking</div>
        <div class="method-sub">All payment methods available in production</div>
      </div>
    </div>
    <div class="method-row">
      <div class="method-icon">🔒</div>
      <div>
        <div class="method-label">256-bit SSL Encryption</div>
        <div class="method-sub">Powered by Razorpay Secure Checkout</div>
      </div>
    </div>
    <div class="method-row">
      <div class="method-icon">⚡</div>
      <div>
        <div class="method-label">Instant verification</div>
        <div class="method-sub">Payment confirmed in real-time via server</div>
      </div>
    </div>
  </div>

  <div class="spinner" id="spinner"></div>
  <div class="processing" id="processing">Processing payment...</div>

  <button class="btn-success" id="btnPay" onclick="simulatePay()">
    ✓ &nbsp;Simulate Successful Payment
  </button>
  <button class="btn-fail" onclick="simulateFail()">
    Simulate Payment Failure (for testing)
  </button>

  <script>
    var rideId = ${JSON.stringify(rideId || "")};
    var orderId = ${JSON.stringify(orderId || "")};

    function showSpinner() {
      document.getElementById('btnPay').style.display = 'none';
      document.getElementById('spinner').style.display = 'block';
      document.getElementById('processing').style.display = 'block';
    }

    function simulatePay() {
      showSpinner();
      var mockPaymentId = 'pay_MOCK_' + Date.now();
      var mockSignature = 'sig_MOCK_' + Math.random().toString(36).substring(2);
      setTimeout(function() {
        window.location.href =
          'https://payment.safargo.local/success' +
          '?payment_id=' + encodeURIComponent(mockPaymentId) +
          '&order_id=' + encodeURIComponent(orderId) +
          '&signature=' + encodeURIComponent(mockSignature) +
          '&ride_id=' + encodeURIComponent(rideId);
      }, 800);
    }

    function simulateFail() {
      window.location.href =
        'https://payment.safargo.local/failed' +
        '?error=' + encodeURIComponent('Simulated payment failure for testing') +
        '&rideId=' + encodeURIComponent(rideId);
    }
  </script>
</body>
</html>`;

  const liveModeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta charset="utf-8">
  <title>Safar Go Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0A0A0A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #fff;
    }
    .logo { width: 72px; height: 72px; border-radius: 22px; background: #C5A55A18; border: 1.5px solid #C5A55A40; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
    .logo svg { width: 40px; height: 40px; }
    .amount { font-size: 44px; font-weight: 800; color: #C5A55A; letter-spacing: -1px; margin-bottom: 4px; }
    h2 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    p { font-size: 14px; color: #666; margin-bottom: 24px; text-align: center; }
    .spinner { width: 44px; height: 44px; border: 3px solid #1e1e1e; border-top-color: #C5A55A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 24px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { font-size: 13px; color: #555; text-align: center; margin-top: 8px; }
    .error-box { background: #E74C3C18; border: 1px solid #E74C3C35; border-radius: 14px; padding: 18px 22px; color: #E74C3C; font-size: 14px; text-align: center; max-width: 320px; margin: 20px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="#C5A55A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
      <rect x="9" y="11" width="14" height="10" rx="2"/>
      <circle cx="12" cy="19" r="1"/><circle cx="20" cy="19" r="1"/>
    </svg>
  </div>
  <div class="amount">₹${amountRupees.toLocaleString("en-IN")}</div>
  <h2>Safar Go</h2>
  <p>Opening secure payment…</p>
  <div class="spinner" id="spinner"></div>
  <div class="status" id="status">Preparing Razorpay checkout</div>

  <script>
    (function() {
      var key = ${JSON.stringify(key || "")};
      var amount = ${JSON.stringify(amount || "0")};
      var orderId = ${JSON.stringify(orderId || "")};
      var rideId = ${JSON.stringify(rideId || "")};
      var prefillName = ${JSON.stringify(name || "Passenger")};
      var prefillEmail = ${JSON.stringify(email || "")};
      var prefillPhone = ${JSON.stringify(phone || "")};

      if (!key || !orderId) {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('status').style.display = 'none';
        document.body.insertAdjacentHTML('beforeend',
          '<div class="error-box">Payment configuration error.<br>Please go back and try again.</div>');
        return;
      }

      var options = {
        key: key,
        amount: amount,
        currency: 'INR',
        name: 'Safar Go',
        description: ${JSON.stringify(desc || "Ride Payment")},
        order_id: orderId,
        prefill: {
          name: prefillName,
          email: prefillEmail,
          contact: prefillPhone
        },
        theme: { color: '#C5A55A' },
        modal: {
          backdropclose: false,
          escape: false,
          ondismiss: function() {
            window.location.href =
              'https://payment.safargo.local/cancelled?rideId=' + encodeURIComponent(rideId);
          }
        },
        handler: function(response) {
          document.getElementById('status').textContent = 'Verifying payment…';
          window.location.href =
            'https://payment.safargo.local/success' +
            '?payment_id=' + encodeURIComponent(response.razorpay_payment_id) +
            '&order_id=' + encodeURIComponent(response.razorpay_order_id) +
            '&signature=' + encodeURIComponent(response.razorpay_signature) +
            '&ride_id=' + encodeURIComponent(rideId);
        }
      };

      var rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(r) {
        var errMsg = (r.error && r.error.description) ? r.error.description : 'Payment failed';
        window.location.href =
          'https://payment.safargo.local/failed' +
          '?error=' + encodeURIComponent(errMsg) +
          '&rideId=' + encodeURIComponent(rideId);
      });

      setTimeout(function() {
        document.getElementById('status').textContent = 'Loading Razorpay…';
        rzp.open();
      }, 500);
    })();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-store");
  res.send(isDevMode ? devModeHtml : liveModeHtml);
});

export default router;
