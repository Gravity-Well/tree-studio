"use strict";

const Stripe = require("stripe");
const { findUserIdByStripeCustomer, getUserPlan, setUserPlan } = require("../shared/storage");

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN = {
  "price_1TGQS2FrZsFJVp0LVDsyJQjO": "pro",
  "price_1TGQTfFrZsFJVp0L9WMjZvxM": "business"
};

module.exports = async function (context, req) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secretKey || !webhookSecret) {
      return json(context, 500, { error: "Stripe not configured." });
    }

    const stripe = Stripe(secretKey);

    // Verify the webhook signature
    const sig = req.headers && req.headers["stripe-signature"];
    if (!sig) return json(context, 400, { error: "Missing stripe-signature header." });

    // Azure Functions provides the raw body as a Buffer when available
    const rawBody = req.rawBody || JSON.stringify(req.body);

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      context.log.warn("Webhook signature verification failed:", err.message);
      return json(context, 400, { error: `Webhook error: ${err.message}` });
    }

    context.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata && session.metadata.userId;
        const tier = session.metadata && session.metadata.tier;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (userId && tier) {
          const existing = await getUserPlan(userId);
          await setUserPlan(userId, {
            ...existing,
            plan: tier,
            stripeCustomerId: customerId,
            subscriptionId
          });
          context.log(`Plan set to ${tier} for user ${userId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const status = sub.status;
        const priceId = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id;
        const tier = PRICE_TO_PLAN[priceId] || "pro";
        const periodEnd = sub.current_period_end;

        const userId = await findUserIdByStripeCustomer(customerId);
        if (userId) {
          const existing = await getUserPlan(userId);
          // active/trialing = paid plan; anything else = revert to free
          const activePlan = ["active", "trialing"].includes(status) ? tier : "free";
          await setUserPlan(userId, {
            ...existing,
            plan: activePlan,
            subscriptionId: sub.id,
            periodEnd
          });
          context.log(`Subscription updated: user ${userId} → ${activePlan} (${status})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;

        const userId = await findUserIdByStripeCustomer(customerId);
        if (userId) {
          const existing = await getUserPlan(userId);
          await setUserPlan(userId, {
            ...existing,
            plan: "free",
            subscriptionId: null,
            periodEnd: null
          });
          context.log(`Subscription cancelled: user ${userId} → free`);
        }
        break;
      }

      default:
        context.log(`Unhandled event type: ${event.type}`);
    }

    return json(context, 200, { received: true });
  } catch (err) {
    context.log.error("Webhook handler error:", err);
    return json(context, 500, { error: err && err.message ? err.message : "Webhook failed." });
  }
};
