"use strict";

const {
  getContainerClient,
  normalizeTreeName,
  streamToString
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
    const nameParam = req.params ? req.params.name : "";
    const name = normalizeTreeName(nameParam);
    const container = getContainerClient();
    const blob = container.getBlobClient(name);

    if (method === "GET") {
      const exists = await blob.exists();
      if (!exists) return json(context, 404, { error: "Tree not found." });

      const download = await blob.download(0);
      const text = await streamToString(download.readableStreamBody);
      let tree = null;
      try {
        tree = JSON.parse(text);
      } catch (_) {
        return json(context, 500, { error: "Stored tree is not valid JSON." });
      }

      return json(context, 200, { name, tree });
    }

    if (method === "DELETE") {
      const result = await blob.deleteIfExists();
      return json(context, 200, { ok: true, deleted: !!result.succeeded, name });
    }

    return json(context, 405, { error: "Method not allowed." });
  } catch (err) {
    return json(context, 400, { error: err && err.message ? err.message : "Request failed." });
  }
};
