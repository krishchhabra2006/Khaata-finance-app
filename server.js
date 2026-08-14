/**
 * Khaata — Personal Finance Dashboard
 * Express server: serves the built React frontend and proxies
 * AI-advice requests to the Anthropic API using a server-side key.
 *
 * The API key NEVER goes to the browser. The frontend calls
 * POST /api/advice on this same server, and this server calls
 * Anthropic on the frontend's behalf.
 */

require("dotenv").config();
const express = require("express");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

if (!ANTHROPIC_API_KEY) {
  console.warn(
    "[WARN] ANTHROPIC_API_KEY is not set. /api/advice will return an error until it is configured."
  );
}

app.use(compression());
app.use(express.json({ limit: "50kb" }));

// Basic health check for load balancers / Elastic Beanstalk
app.get("/health", (req, res) => res.status(200).send("ok"));

// Rate limit the AI endpoint — protects your Anthropic spend from abuse
const adviceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12, // 12 requests/minute/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

app.post("/api/advice", adviceLimiter, async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY." });
  }

  const { name, situation, cycleLabel, spendable, dailyBudget, fixed, categories } = req.body || {};

  if (!situation || !Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: "Missing required plan data." });
  }

  // Keep the model's input small and structured — cheaper, faster, more reliable
  const catSummary = categories
    .map((c) => `${c.name}: ₹${Math.round(c.amount)} (${Math.round(c.pct)}%)`)
    .join(", ");

  const prompt = `You are a calm, encouraging personal-finance advisor writing inside a budgeting app.
Write a short, specific advisory note (3-4 sentences, plain language, no headers, no markdown, no bullet points) for this user's budget plan.

User name: ${name || "the user"}
Situation: ${situation}
Cycle: ${cycleLabel || "this period"}
Spendable amount: ₹${Math.round(spendable || 0)}
Fixed costs already deducted: ₹${Math.round(fixed || 0)}
Safe daily budget: ₹${Math.round(dailyBudget || 0)}
Category breakdown: ${catSummary}

Rules:
- Reference at least one specific category and its amount.
- Give exactly one concrete, actionable tip tied to a real number from above.
- Tone: warm, direct, never alarmist, never generic ("spend wisely" is not allowed).
- Do not repeat the raw numbers as a list — write it as flowing prose.
- Output only the note itself, nothing else.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "AI advice service is temporarily unavailable." });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const advice = textBlock ? textBlock.text.trim() : null;

    if (!advice) {
      return res.status(502).json({ error: "AI advice service returned an empty response." });
    }

    res.json({ advice });
  } catch (err) {
    console.error("Failed to reach Anthropic API:", err);
    res.status(502).json({ error: "Could not reach AI advice service." });
  }
});

// Serve the built React app
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));

// SPA fallback — must come after API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Khaata server listening on port ${PORT}`);
});
