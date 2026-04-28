export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ response: "Method not allowed." });
  }

  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ response: "Missing message." });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ response: "Missing OpenAI API key in Vercel." });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content:
              "You are Ena, the AI assistant for EnAction.ai. EnAction.ai builds AI chatbots and AI agents for small businesses. Keep replies short, friendly, and helpful. Help visitors understand how website chat can capture leads, answer questions, qualify prospects, and guide bookings.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error("OpenAI error:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        response: `OpenAI error: ${data.error?.message || "Unknown error"}`,
      });
    }

    const reply =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      data.output?.[0]?.content?.[0]?.text?.value ||
      "I got a response from OpenAI, but could not read it.";

    return res.status(200).json({ response: reply });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      response: `Server error: ${error.message}`,
    });
  }
}
