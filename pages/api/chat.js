export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ response: "Method not allowed." });
  }

  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ response: "Missing message." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const WEBHOOK_URL = "https://eo7zgg7h6b8dayi.m.pipedream.net";

  if (!apiKey) {
    return res.status(500).json({ response: "Missing OpenAI API key in Vercel." });
  }

  const businessInfo = `
Business Name: EnAction.ai
Services: AI chatbots and AI agents for small businesses
Pricing: $100 setup and $75/month for the starter chatbot
Ideal Customers: Small businesses, service businesses, local companies, and companies that want better website lead capture
Main Value: Turn website visitors into leads, conversations, quote requests, bookings, and follow-up opportunities
Core Capabilities: Answer FAQs, capture leads, qualify prospects, guide booking requests, collect contact information, and notify the business
What Makes It Different: Simple setup, no tech skills required, focused on real business outcomes like leads, bookings, and faster follow-up
Agent Upgrade: AI agents can qualify, route, book, follow up, and trigger workflows when a company needs more than a basic chatbot
`;

  const instructions = `
You are Ena, the AI assistant for EnAction.ai.

Use the business information below to answer questions.

Your rules:
1. Keep answers short, friendly, and helpful.
2. Speak in simple business language.
3. Do not make up company details.
4. If you do not know something, say you are not sure and offer to collect the visitor's information.
5. Ask one question at a time.
6. Keep most replies under 3 to 4 short sentences.
7. If someone shows interest, ask for their name first.
8. After getting their name, ask for their email.
9. After getting their email, ask for their phone number.
10. After getting their phone number, ask what type of business they run.
11. After getting their business type, ask what they would want the bot to help with.
12. Explain that EnAction.ai can build simple chatbots first, then upgrade to AI agents that can qualify, route, book, follow up, and trigger workflows.
13. Do not mention OpenAI, API keys, backend code, or technical setup unless the visitor specifically asks.

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
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: instructions,
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

    const emailMatch = message.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    const phoneMatch = message.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    const nameMatch =
      message.match(/(?:my name is|name is|i am|i'm)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    const companyMatch =
      message.match(/(?:company is|business is|from|at|own|run)\s+([a-zA-Z0-9&.' -]+)/i);

    const lead = {
      name: nameMatch?.[1]?.trim() || "",
      email: emailMatch?.[0]?.trim() || "",
      phone: phoneMatch?.[1]?.trim() || "",
      company: companyMatch?.[1]?.trim() || "",
      message,
      source: "EnAction.ai website chatbot",
      timestamp: new Date().toISOString(),
    };

    const hasLeadInfo =
      lead.name || lead.email || lead.phone || lead.company;

    if (hasLeadInfo) {
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lead),
        });
      } catch (webhookError) {
        console.error("Webhook error:", webhookError);
      }
    }

    return res.status(200).json({ response: reply });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      response: `Server error: ${error.message}`,
    });
  }
}
