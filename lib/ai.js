import Anthropic from "@anthropic-ai/sdk";

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function askClaude(systemPrompt, userMessage, maxTokens = 1024) {
  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    return response.content?.[0]?.text || "";
  } catch (e) {
    console.error("Claude API error:", e);
    return null;
  }
}

export async function askClaudeJSON(systemPrompt, userMessage, maxTokens = 1024) {
  const raw = await askClaude(
    systemPrompt + "\n\nRespond ONLY with valid JSON. No markdown, no backticks, no preamble.",
    userMessage,
    maxTokens
  );
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
