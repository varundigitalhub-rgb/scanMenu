import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();

const app = express();

// Parse JSON bodies
app.use(express.json());

// CORS – restrict to your frontend origin
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
app.use(
  cors({
    origin: allowedOrigin
  })
);

// Razorpay configuration from environment
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set.");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Simple plan catalogue (server decides the amount)
const PLANS = {
  "premium-monthly": {
    amountInPaise: 39900, // ₹399.00
    currency: "INR",
    description: "ScanMenu Premium - Monthly"
  }
};

// POST /create-order
app.post("/create-order", async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId || !PLANS[planId]) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing planId" });
    }

    const plan = PLANS[planId];

    const options = {
      amount: plan.amountInPaise,
      currency: plan.currency,
      receipt: `receipt_${planId}_${Date.now()}`,
      notes: { planId }
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      keyId: RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId,
      description: plan.description
    });
  } catch (err) {
    console.error("Error creating Razorpay order:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not create order" });
  }
});

// POST /verify-payment
app.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    if (!PLANS[planId]) {
      return res
        .status(400)
        .json({ success: false, message: "Unknown planId" });
    }

    return res.json({ success: true, planId });
  } catch (err) {
    console.error("Error verifying payment:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not verify payment" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ScanMenu backend listening on port ${PORT}`);
});

