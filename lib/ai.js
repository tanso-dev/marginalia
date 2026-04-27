const API_URL = "https://api.anthropic.com/v1/messages";

export async function askClaude(systemPrompt, userMessage, maxTokens = 1024) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API HTTP error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text || "";
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
  } catch (e) {
    console.error("JSON parse error:", e.message, "Raw:", raw.substring(0, 200));
    return null;
  }
}
