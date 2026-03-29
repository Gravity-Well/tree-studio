"use strict";

const {
  getContainerClient,
  userPrefix,
  streamToString
} = require("../shared/storage");

function json(context, status, body) {
  context.res = {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    },
    body
  };
}

module.exports = async function (context, req) {
  try {
    const userId = req.params && req.params.userId ? req.params.userId : "";
    const name = req.params && req.params.name ? req.params.name : "";

    if (!userId || !name) return json(context, 400, { error: "Missing userId or name." });

    const safeName = name.toLowerCase().endsWith(".json") ? name : `${name}.json`;
    const blobName = `${userPrefix(userId)}/${safeName}`;

    const container = getContainerClient();
    const blob = container.getBlobClient(blobName);

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
  } catch (err) {
    return json(context, 400, { error: err && err.message ? err.message : "Request failed." });
  }
};
