"use strict";

module.exports = async function (context, req) {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  context.res = {
    status: publishableKey ? 200 : 500,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: publishableKey
      ? { publishableKey }
      : { error: "Stripe not configured." }
  };
};
