"use strict";

const { getContainerClient, getUserId, userPrefix, streamToString } = require("../shared/storage");

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

function profileBlobKey(userId) {
  return `profiles/${userPrefix(userId)}.json`;
}

async function getProfile(userId) {
  try {
    const container = getContainerClient();
    const blob = container.getBlockBlobClient(profileBlobKey(userId));
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody);
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

module.exports = async function (context, req) {
  const userId = getUserId(req);
  if (!userId) return json(context, 401, { error: "Not authenticated." });

  if (req.method === "GET") {
    try {
      const profile = await getProfile(userId);
      return json(context, 200, profile);
    } catch (err) {
      return json(context, 500, { error: err.message || "Failed to load profile." });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};

      // Sanitize — only allow known fields, max lengths
      const profile = {};
      if (typeof body.displayName === "string") profile.displayName = body.displayName.trim().slice(0, 80);
      if (typeof body.email === "string")       profile.email       = body.email.trim().slice(0, 200);
      if (typeof body.company === "string")     profile.company     = body.company.trim().slice(0, 100);
      if (typeof body.website === "string")     profile.website     = body.website.trim().slice(0, 200);
      if (typeof body.bio === "string")         profile.bio         = body.bio.trim().slice(0, 300);
      profile.updatedAt = new Date().toISOString();

      // Basic email validation
      if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
        return json(context, 400, { error: "Invalid email address." });
      }

      const container = getContainerClient();
      const blob = container.getBlockBlobClient(profileBlobKey(userId));
      const serialized = JSON.stringify(profile, null, 2);
      await blob.upload(serialized, Buffer.byteLength(serialized), {
        blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" },
        overwrite: true
      });

      return json(context, 200, { ok: true, profile });
    } catch (err) {
      return json(context, 500, { error: err.message || "Failed to save profile." });
    }
  }

  return json(context, 405, { error: "Method not allowed." });
};
