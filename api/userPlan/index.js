"use strict";

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

    const planData = await getUserPlan(userId);
    return json(context, 200, planData);
  } catch (err) {
    return json(context, 500, { error: err && err.message ? err.message : "Failed to get plan." });
  }
};
