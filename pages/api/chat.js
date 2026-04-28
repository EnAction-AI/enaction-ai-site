export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ response: "Method not allowed." });
  }

  const { message, messages = [] } = req.body || {};
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
Main Value: Turn website visitors into leads, quote requests, bookings, and follow-up opportunities
Core Capabilities: Answer FAQs, capture leads, qualify prospects, guide booking requests, collect contact information, and notify the business
What Makes It Different: Simple setup, no tech skills required, focused on real business outcomes like leads, bookings, and faster follow-up
Agent Upgrade: AI agents can qualify, route, book, follow up, and trigger workflows when a company needs more than a basic chatbot
`;

  const instructions = `
You are Ena, the AI assistant for EnAction.ai.

Your goal is to help sell EnAction.ai in a natural, conversational way.

Rules:
1. Be warm, confident, and conversational.
2. Keep replies short, usually 2 to 4 sentences.
3. Remember what the visitor already told you.
4. Do not ask for information they already provided.
5. Ask one question at a time.
6. If they seem interested, collect name, email, phone, business name, and what they want the bot to help with.
7. Do not sound robotic.
8. Do not over-explain.
9. Tie answers back to business outcomes: more leads, faster follow-up, better customer experience, and less missed opportunity.
10. If they give unclear answers, continue naturally.
11. Do not mention OpenAI, code, APIs, or backend setup unless asked.
12. When collecting lead info, naturally move to the next missing item only.

Business information:
${businessInfo}
`;

  try {
    const conversationInput = messages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        instructions,
        input: conversationInput.length
          ? conversationInput
          : [{ role: "user", content: message }],
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

    const allText = messages.map((m) => m.content).join(" ");

    const emailMatch = allText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    const phoneMatch = allText.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i);
    const nameMatch = allText.match(/(?:my name is|name is|i am|i'm)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    const companyMatch = allText.match(/(?:company is|business is|from|at|own|run)\s+([a-zA-Z0-9&.' -]+)/i);

    const lead = {
      name: nameMatch?.[1]?.trim() || "",
      email: emailMatch?.[0]?.trim() || "",
      phone: phoneMatch?.[1]?.trim() || "",
      company: companyMatch?.[1]?.trim() || "",
      message: allText,
      source: "EnAction.ai website chatbot",
      timestamp: new Date().toISOString(),
    };

    const latestMessage = message.toLowerCase();

    const latestMessageHasLeadInfo =
      emailMatch?.[0]?.toLowerCase() === latestMessage ||
      phoneMatch?.[1]?.toLowerCase() === latestMessage ||
      latestMessage.includes("my name is") ||
      latestMessage.includes("name is") ||
      latestMessage.includes("i am") ||
      latestMessage.includes("i'm") ||
      latestMessage.includes("business") ||
      latestMessage.includes("company") ||
      latestMessage.includes("own") ||
      latestMessage.includes("run");

    if ((lead.email || lead.phone || lead.name || lead.company) && latestMessageHasLeadInfo) {
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
