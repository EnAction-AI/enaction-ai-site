export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message } = req.body;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.error("Missing OpenAI API key");
    return res.status(500).json({ error: "Missing OpenAI API key" });
  }

  const businessInfo = `
Business Name: EnAction.ai
Services: AI chatbots and AI agents for small businesses
Pricing: $100 setup, $75/month starter chatbot
Main Goal: Help small businesses capture website visitors as leads
Core Benefits: Answer questions, capture leads, qualify prospects, guide booking requests, and send lead details to the business
`;

  const instructions = `
You are Ena, the AI assistant for the business below.

Your job:
1. Answer questions using only the business info provided
2. Keep replies short, friendly, and helpful
3. Ask one question at a time
4. If the visitor seems interested, ask for their name, email, phone, and business name
5. If you do not know an answer, say you are not sure and offer to collect their info for follow up
6. Do not make up company details

Business info:
${businessInfo}
`;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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
      return res.status(500).json({ error: "OpenAI request failed" });
    }

    const reply = data.output_text || "Sorry, I had trouble getting a response.";

    res.status(200).json({ response: reply });
  } catch (e) {
    console.error("API error:", e);
    res.status(500).json({ error: "Something went wrong." });
  }
}
