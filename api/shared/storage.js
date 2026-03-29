"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");

function getConfig() {
  const connectionString =
    process.env.TREE_BLOB_CONNECTION_STRING ||
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    process.env.AzureWebJobsStorage;
  const containerName = process.env.TREE_BLOB_CONTAINER || "trees";
  if (!connectionString) {
    throw new Error("Missing storage connection setting.");
  }
  return { connectionString, containerName };
}

function getContainerClient() {
  const cfg = getConfig();
  const service = BlobServiceClient.fromConnectionString(cfg.connectionString);
  return service.getContainerClient(cfg.containerName);
}

/**
 * Decode the SWA client principal header and return the userId.
 * Returns null if the header is missing or invalid.
 */
function getUserId(req) {
  try {
    const header = req.headers && req.headers["x-ms-client-principal"];
    if (!header) return null;
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    return principal.userId || null;
  } catch (_) {
    return null;
  }
}

/**
 * Sanitize userId for use as a blob path prefix.
 */
function userPrefix(userId) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizeTreeName(name, userId) {
  const raw = String(name || "").trim();
  if (!raw) throw new Error("Tree name is required.");

  const cleaned = raw.replace(/\\/g, "/");
  if (cleaned.startsWith("/") || cleaned.includes("..")) {
    throw new Error("Invalid tree name.");
  }

  const normalized = cleaned.split("/").filter(Boolean).join("/");
  if (!normalized) throw new Error("Invalid tree name.");

  const withExt = normalized.toLowerCase().endsWith(".json")
    ? normalized
    : `${normalized}.json`;

  return userId ? `${userPrefix(userId)}/${withExt}` : withExt;
}

function validateTreePayload(tree) {
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) {
    throw new Error("Tree payload must be an object.");
  }
  if (typeof tree.label !== "string" || tree.label.trim() === "") {
    throw new Error("Tree root must include a non-empty label.");
  }
}

async function streamToString(stream) {
  if (!stream) return "";
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

/**
 * Read a user's plan record from blob storage.
 * Returns { plan: "free"|"pro"|"business", stripeCustomerId, subscriptionId, periodEnd }
 */
async function getUserPlan(userId) {
  try {
    const container = getContainerClient();
    const blob = container.getBlockBlobClient(`plans/${userPrefix(userId)}.json`);
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody);
    return JSON.parse(text);
  } catch (_) {
    return { plan: "free" };
  }
}

/**
 * Write a user's plan record to blob storage.
 */
async function setUserPlan(userId, planData) {
  const container = getContainerClient();
  const blob = container.getBlockBlobClient(`plans/${userPrefix(userId)}.json`);
  const serialized = JSON.stringify(planData, null, 2);
  await blob.upload(serialized, Buffer.byteLength(serialized), {
    blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" },
    overwrite: true
  });
}

/**
 * Find a userId by Stripe customer ID (scans plan blobs — use sparingly).
 */
async function findUserIdByStripeCustomer(stripeCustomerId) {
  try {
    const container = getContainerClient();
    for await (const blob of container.listBlobsFlat({ prefix: "plans/" })) {
      try {
        const client = container.getBlockBlobClient(blob.name);
        const download = await client.download();
        const text = await streamToString(download.readableStreamBody);
        const data = JSON.parse(text);
        if (data.stripeCustomerId === stripeCustomerId) {
          // Extract userId from blob name: plans/{userId}.json
          return blob.name.replace("plans/", "").replace(".json", "");
        }
      } catch (_) { /* skip corrupt entries */ }
    }
  } catch (_) {}
  return null;
}

module.exports = {
  getContainerClient,
  getUserId,
  userPrefix,
  normalizeTreeName,
  validateTreePayload,
  streamToString,
  getUserPlan,
  setUserPlan,
  findUserIdByStripeCustomer
};
