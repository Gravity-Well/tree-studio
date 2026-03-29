"use strict";

const Stripe = require("stripe");
const { getUserId, getUserPlan, setUserPlan } = require("../shared/storage");

const PRICE_IDS = {
  pro: "price_1TGQS2FrZsFJVp0LVDsyJQjO",
  business: "price_1TGQTfFrZsFJVp0L9WMjZvxM"
};

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

module.exports = async function (context, req) {
  try {
    const userId = getUserId(req);
    if (!userId) return json(context, 401, { error: "Not authenticated." });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return json(context, 500, { error: "Stripe not configured." });

    const stripe = Stripe(secretKey);
    const body = req.body || {};
    const tier = (body.tier || "pro").toLowerCase();
    const priceId = PRICE_IDS[tier];
    if (!priceId) return json(context, 400, { error: "Invalid plan tier." });

    const origin = process.env.APP_ORIGIN || "https://treestudio.nusoftva.com";

    // Retrieve or create a Stripe customer tied to this userId
    let planData = await getUserPlan(userId);
    let customerId = planData.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId }
      });
      customerId = customer.id;
      // Persist immediately so webhook can look it up
      await setUserPlan(userId, { ...planData, stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?upgraded=1`,
      cancel_url: `${origin}/app?upgrade_cancelled=1`,
      metadata: { userId, tier }
    });

    return json(context, 200, { url: session.url });
  } catch (err) {
    return json(context, 500, { error: err && err.message ? err.message : "Checkout failed." });
  }
};
