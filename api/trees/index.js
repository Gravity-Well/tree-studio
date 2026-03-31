"use strict";

const {
  getContainerClient,
  getUserId,
  userPrefix,
  normalizeTreeName,
  validateTreePayload,
  getUserPlan
} = require("../shared/storage");

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

    const method = (req.method || "").toUpperCase();
    const container = getContainerClient();
    const prefix = userPrefix(userId) + "/";

    if (method === "GET") {
      const items = [];
      for await (const blob of container.listBlobsFlat({ prefix })) {
        if (!blob.name.toLowerCase().endsWith(".json")) continue;
        // Strip the user prefix from the name returned to the client
        const displayName = blob.name.slice(prefix.length);
        items.push({
          name: displayName,
          size: blob.properties && blob.properties.contentLength ? blob.properties.contentLength : 0,
          lastModified: blob.properties && blob.properties.lastModified
            ? new Date(blob.properties.lastModified).toISOString()
            : null
        });
      }

      items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      return json(context, 200, { items });
    }

    if (method === "POST") {
      const body = req.body || {};
      const name = normalizeTreeName(body.name, userId);
      const tree = body.tree;
      validateTreePayload(tree);

      // Enforce free-tier limit (5 trees max) — skip for paid plans
      const planData = await getUserPlan(userId);
      const isPaid = planData && (planData.plan === "pro" || planData.plan === "business");
      const FREE_LIMIT = 5;
      let existingCount = 0;
      for await (const blob of container.listBlobsFlat({ prefix })) {
        if (blob.name.toLowerCase().endsWith(".json")) existingCount++;
      }

      // Allow overwriting an existing tree (same name → same blob key)
      const blobKey = name; // normalizeTreeName returns the full blob path
      let isOverwrite = false;
      try {
        const existing = container.getBlockBlobClient(blobKey);
        const props = await existing.getProperties();
        if (props) isOverwrite = true;
      } catch (_) { /* doesn't exist yet */ }

      if (!isPaid && !isOverwrite && existingCount >= FREE_LIMIT) {
        return json(context, 403, {
          error: "FREE_TIER_LIMIT",
          message: `Free accounts can save up to ${FREE_LIMIT} trees. Delete a tree or upgrade to Pro.`
        });
      }

      const serialized = JSON.stringify(tree, null, 2);
      const blob = container.getBlockBlobClient(name);
      await blob.upload(serialized, Buffer.byteLength(serialized), {
        blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" }
      });

      return json(context, 200, { ok: true, name: body.name });
    }

    return json(context, 405, { error: "Method not allowed." });
  } catch (err) {
    return json(context, 400, { error: err && err.message ? err.message : "Request failed." });
  }
};
