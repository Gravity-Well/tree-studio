"use strict";

const { getUserId } = require("../shared/storage");

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

const SYSTEM_PROMPT = `You are a tree diagram assistant. Your job is to generate hierarchical tree structures in JSON format.

Always respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

The JSON format is:
{
  "label": "Root node text",
  "children": [
    {
      "label": "Child node text",
      "children": [...]
    }
  ]
}

Rules:
- Node labels should be concise (1-6 words ideally, max 10 words)
- Use newlines in labels sparingly, only when it genuinely helps readability
- Generate 3-7 children per node at each level
- Go 2-3 levels deep unless the user asks for more or less
- The tree should be immediately useful and accurate
- Do not include any text outside the JSON object`;

const EXPAND_SYSTEM_PROMPT = `You are a tree diagram assistant. Your job is to suggest child nodes for an existing node in a tree diagram.

Always respond with ONLY a valid JSON array — no markdown, no explanation, no code fences.

The format is an array of node objects:
[
  { "label": "Child 1", "children": [] },
  { "label": "Child 2", "children": [] }
]

Rules:
- Generate 3-7 children
- Node labels should be concise (1-6 words ideally, max 10 words)
- Children should be logically related to the node being expanded
- Use the tree context to avoid repeating what's already there
- Do not include any text outside the JSON array`;

module.exports = async function (context, req) {
  if ((req.method || "").toUpperCase() !== "POST") {
    return json(context, 405, { error: "Method not allowed." });
  }

  const userId = getUserId(req);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(context, 500, { error: "AI not configured." });

  const body = req.body || {};
  const { mode, prompt, nodeLabel, treeSummary } = body;

  if (!mode || !["tree", "expand"].includes(mode)) {
    return json(context, 400, { error: "mode must be 'tree' or 'expand'." });
  }
  if (mode === "tree" && !prompt) {
    return json(context, 400, { error: "prompt is required for tree mode." });
  }
  if (mode === "expand" && !nodeLabel) {
    return json(context, 400, { error: "nodeLabel is required for expand mode." });
  }

  const userMessage = mode === "tree"
    ? `Generate a tree diagram for: ${prompt}`
    : `Expand this node: "${nodeLabel}"\n\nTree context (for reference, do not repeat):\n${treeSummary || "none"}`;

  const systemPrompt = mode === "tree" ? SYSTEM_PROMPT : EXPAND_SYSTEM_PROMPT;

  try {
    context.log(`[aiGenerate] mode=${mode} userId=${userId || "anonymous"}`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const err = await response.text();
      context.log.error("[aiGenerate] OpenAI error status:", response.status, "body:", err);
      return json(context, 502, { error: `AI request failed (${response.status}). Please try again.` });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();

    if (!raw) return json(context, 502, { error: "Empty response from AI." });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      context.log.error("[aiGenerate] JSON parse failed:", raw);
      return json(context, 502, { error: "AI returned invalid structure. Please try again." });
    }

    context.log(`[aiGenerate] success mode=${mode}`);
    return json(context, 200, { result: parsed });

  } catch (err) {
    context.log.error("[aiGenerate] error:", err.message);
    return json(context, 500, { error: "AI generation failed. Please try again." });
  }
};
