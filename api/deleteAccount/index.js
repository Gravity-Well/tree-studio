"use strict";

const { getContainerClient, getUserId, getUserPlan, userPrefix } = require("../shared/storage");

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

module.exports = async function (context, req) {
  if (req.method !== "DELETE") return json(context, 405, { error: "Method not allowed." });

  const userId = getUserId(req);
  if (!userId) return json(context, 401, { error: "Not authenticated." });

  try {
    // Block deletion if user has an active paid subscription
    const planData = await getUserPlan(userId);
    if (planData && (planData.plan === "pro" || planData.plan === "business")) {
      return json(context, 400, {
        error: "ACTIVE_SUBSCRIPTION",
        message: "Please cancel your subscription before deleting your account."
      });
    }

    const container = getContainerClient();
    const prefix = userPrefix(userId) + "/";
    let deleted = 0;

    // Delete all tree blobs
    for await (const blob of container.listBlobsFlat({ prefix })) {
      await container.getBlockBlobClient(blob.name).deleteIfExists();
      deleted++;
    }

    // Delete plan blob
    await container.getBlockBlobClient(`plans/${userPrefix(userId)}.json`).deleteIfExists();

    return json(context, 200, { ok: true, deleted });
  } catch (err) {
    return json(context, 500, { error: err && err.message ? err.message : "Delete failed." });
  }
};
