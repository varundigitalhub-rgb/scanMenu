const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const razorpayKeyId = functions.config().razorpay.key_id;
const razorpayKeySecret = functions.config().razorpay.key_secret;

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret
});

const plans = {
  "pro-monthly": {
    amount: 39900,
    currency: "INR",
    displayName: "QR Menu SaaS - Pro",
    description: "Pro plan - Monthly subscription"
  }
};

exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to create an order."
    );
  }

  const uid = context.auth.uid;
  const planId = data.planId || "pro-monthly";
  const plan = plans[planId];

  if (!plan) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid planId.");
  }

  const options = {
    amount: plan.amount,
    currency: plan.currency,
    receipt: `sub_${uid}_${Date.now()}`,
    notes: {
      uid,
      planId
    }
  };

  const order = await razorpay.orders.create(options);

  return {
    orderId: order.id,
    amount: plan.amount,
    currency: plan.currency,
    keyId: razorpayKeyId,
    displayName: plan.displayName,
    description: plan.description
  };
});

exports.confirmRazorpayPayment = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to confirm payment."
      );
    }

    const uid = context.auth.uid;
    const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      data;

    if (!planId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing payment details."
      );
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Invalid payment signature."
      );
    }

    const now = admin.firestore.Timestamp.now();
    const periodEnd = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30 * 24 * 60 * 60 * 1000
    );

    await db
      .collection("subscriptions")
      .doc(uid)
      .set(
        {
          plan: "pro",
          status: "active",
          currentPeriodEnd: periodEnd,
          lastPaymentId: razorpay_payment_id,
          lastOrderId: razorpay_order_id,
          updatedAt: now
        },
        { merge: true }
      );

    return { success: true };
  }
);

