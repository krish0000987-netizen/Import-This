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
    res.json({ orderId: existing.orderId, amount: existing.amount, keyId: RAZORPAY_KEY_ID });
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
  const { orderId, amount, key, rideId, name, email, phone, desc } = req.query as Record<string, string>;

  const html = `<!DOCTYPE html>
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
    .logo { width: 64px; height: 64px; border-radius: 20px; background: #C5A55A20; border: 1.5px solid #C5A55A40; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
    .logo svg { width: 36px; height: 36px; }
    h2 { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    p { font-size: 14px; color: #888; margin-bottom: 24px; text-align: center; }
    .amount { font-size: 32px; font-weight: 800; color: #C5A55A; margin-bottom: 4px; }
    .spinner { width: 40px; height: 40px; border: 3px solid #222; border-top-color: #C5A55A; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-box { background: #E74C3C20; border: 1px solid #E74C3C40; border-radius: 12px; padding: 16px 24px; color: #E74C3C; font-size: 14px; text-align: center; max-width: 320px; margin: 20px; }
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
  <div class="amount">₹${Math.round(parseInt(amount || "0") / 100)}</div>
  <h2>Safar Go</h2>
  <p>Secure Ride Payment</p>
  <div class="spinner" id="spinner"></div>

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
        document.body.insertAdjacentHTML('beforeend', '<div class="error-box">Payment configuration error. Please go back and try again.</div>');
        return;
      }

      var options = {
        key: key,
        amount: amount,
        currency: 'INR',
        name: 'Safar Go',
        description: ${JSON.stringify(desc || "Ride Payment")},
        order_id: orderId,
        prefill: { name: prefillName, email: prefillEmail, contact: prefillPhone },
        theme: { color: '#C5A55A' },
        modal: {
          backdropclose: false,
          escape: false,
          ondismiss: function() {
            window.location.href = 'https://payment.safargo.local/cancelled?rideId=' + encodeURIComponent(rideId);
          }
        },
        handler: function(response) {
          document.getElementById('spinner').style.display = 'block';
          window.location.href = 'https://payment.safargo.local/success?payment_id=' + encodeURIComponent(response.razorpay_payment_id) + '&order_id=' + encodeURIComponent(response.razorpay_order_id) + '&signature=' + encodeURIComponent(response.razorpay_signature) + '&ride_id=' + encodeURIComponent(rideId);
        }
      };

      var rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function(r) {
        window.location.href = 'https://payment.safargo.local/failed?error=' + encodeURIComponent((r.error && r.error.description) || 'Payment failed') + '&rideId=' + encodeURIComponent(rideId);
      });

      setTimeout(function() {
        document.getElementById('spinner').style.display = 'none';
        rzp.open();
      }, 600);
    })();
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
