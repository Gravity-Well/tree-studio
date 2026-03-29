"use strict";

const {
  getContainerClient,
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
    const method = (req.method || "").toUpperCase();
    const container = getContainerClient();

    if (method === "GET") {
      const items = [];
      for await (const blob of container.listBlobsFlat()) {
        if (!blob.name.toLowerCase().endsWith(".json")) continue;
        items.push({
          name: blob.name,
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
      const name = normalizeTreeName(body.name);
      const tree = body.tree;
      validateTreePayload(tree);

      const serialized = JSON.stringify(tree, null, 2);
      const blob = container.getBlockBlobClient(name);
      await blob.upload(serialized, Buffer.byteLength(serialized), {
        blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" }
      });

      return json(context, 200, { ok: true, name });
    }

    return json(context, 405, { error: "Method not allowed." });
  } catch (err) {
    return json(context, 400, { error: err && err.message ? err.message : "Request failed." });
  }
};
