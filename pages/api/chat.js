import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    // Debug checks
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        reply: "Debug error: OPENAI_API_KEY is missing in environment variables",
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        reply: "Debug error: messages array is missing or invalid",
      });
    }

    // Build input for OpenAI
    const input = [
      {
        role: "system",
        content:
          "You are Ena, a friendly AI assistant for EnAction.ai. You help small businesses understand how a website chatbot can capture leads, answer questions, and increase conversions. Keep responses short, helpful, and conversational.",
      },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    // Safely extract reply
    let reply = "Sorry, I had trouble responding.";

    if (response.output_text) {
      reply = response.output_text;
    } else if (
      response.output &&
      response.output[0] &&
      response.output[0].content &&
      response.output[0].content[0] &&
      response.output[0].content[0].text
    ) {
      reply = response.output[0].content[0].text;
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Ena chatbot error:", error);

    return res.status(500).json({
      reply: `Debug error: ${error.message}`,
    });
  }
}
