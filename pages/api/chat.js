export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing OpenAI API key" });
  }

  const businessInfo = `
Business Name: EnAction.ai
What We Do: EnAction.ai builds AI chatbots and AI agents for small businesses.
Primary Goal: Help businesses turn website visitors into leads, conversations, quote requests, bookings, and follow-up opportunities.
Starter Offer: Custom website chatbot setup for small businesses.
Core Capabilities: Answer FAQs, capture leads, qualify prospects, guide booking requests, collect contact information, and notify the business.
Target Customers: Small businesses, service businesses, local companies, and companies that want better website lead capture.
`;

  const instructions = `
You are Ena, the AI assistant for EnAction.ai.

Use the business information below to answer questions.

Your rules:
1. Keep answers short, friendly, and helpful.
2. Speak in simple business language.
3. Do not make up company details.
4. If you do not know something, say you are not sure and offer to collect the visitor's information.
5. If someone seems interested, ask for their name, email, phone, business name, and what they want the bot to help with.
6. Ask one question at a time when collecting information.
7. Explain that EnAction.ai can build simple chatbots first, then upgrade to AI agents that can qualify, route, book, follow up, and trigger workflows.

Business information:
${businessInfo}
`;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions,
        input: message,
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "OpenAI request failed",
        details: data,
      });
    }

    return res.status(200).json({
      response: data.output_text || "I had trouble reading the response.",
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
