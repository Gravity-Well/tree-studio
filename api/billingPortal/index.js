"use strict";

const Stripe = require("stripe");
const { getUserId, getUserPlan } = require("../shared/storage");

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

    const planData = await getUserPlan(userId);
    if (!planData.stripeCustomerId) {
      return json(context, 400, { error: "No billing account found." });
    }

    const stripe = Stripe(secretKey);
    const origin = process.env.APP_ORIGIN || "https://treestudio.nusoftva.com";

    const session = await stripe.billingPortal.sessions.create({
      customer: planData.stripeCustomerId,
      return_url: `${origin}/app`
    });

    return json(context, 200, { url: session.url });
  } catch (err) {
    return json(context, 500, { error: err && err.message ? err.message : "Portal failed." });
  }
};
