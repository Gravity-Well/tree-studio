"use strict";

const {
  getContainerClient,
  getUserId,
  userPrefix,
  normalizeTreeName,
  validateTreePayload
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
