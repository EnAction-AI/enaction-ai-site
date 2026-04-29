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
Ideal Customers: Small businesses, service businesses, local companies, and companies that want better website lead capture
Main Value: Turn website visitors into leads, quote requests, bookings, and follow-up opportunities
Core Capabilities: Answer FAQs, capture leads, qualify prospects, guide booking requests, collect contact information, and notify the business
What Makes It Different: Simple setup, no tech skills required, focused on real business outcomes like leads, bookings, and faster follow-up
Agent Upgrade: AI agents can qualify, route, book, follow up, and trigger workflows when a company needs more than a basic chatbot
Pricing Guidance: Do not proactively give exact pricing. EnAction.ai has options for different business sizes and needs.
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
6. Focus on business outcomes: more leads, faster follow-up, better customer experience, less missed opportunity.
7. Do not sound robotic.
8. Do not over-explain.
9. If they seem interested, collect name, email, phone, business name, and what they want the bot to help with.
10. When collecting info, move naturally to the next missing item only.
11. If the visitor gives information out of order, accept it and continue asking for the missing item.
12. Do NOT proactively mention pricing.
13. If asked about pricing, say pricing depends on the business and what they need. Explain that EnAction.ai has options for different business sizes and offer to learn about their business first before giving specifics.
14. Do not mention OpenAI, code, APIs, or backend setup unless asked.
15. If doing a demo simulation as if you are the visitor's business chatbot, do not overwrite or confuse the real EnAction.ai lead capture info.
16. In a demo simulation, clearly act as the visitor's business chatbot and answer based on the business details they gave. If the detail is not known, do not make it up.

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

    // AI LEAD EXTRACTION
    const userOnlyTranscript = messages
      .filter((m) => m.role === "user")
      .map((m) => `User: ${m.content}`)
      .join("\n");

    const extractionPrompt = `
Extract lead information from this website chat transcript.

Return ONLY valid JSON. No markdown. No explanation.

Fields:
{
  "name": "",
  "email": "",
  "phone": "",
  "company": "",
  "businessType": "",
  "needs": "",
  "isLead": true or false
}

Rules:
- Only use information clearly provided by the visitor.
- Do not use assistant messages as lead data.
- Do not guess.
- Do not treat phrases like "thank you", "sure", "yes", or "no thanks" as a name.
- If the visitor gives a business name like "JSS Handyman" or "Mikes Roofing", put it in company.
- If they say "I'm a handyman" or "I run a roofing company", put that in businessType.
- If they describe what they want help with, put that in needs.
- isLead should be true only if they showed interest in EnAction.ai or provided contact info.

Transcript:
${userOnlyTranscript}
`;

    let lead = {
      name: "",
      email: "",
      phone: "",
      company: "",
      businessType: "",
      needs: "",
      isLead: false,
    };

    try {
      const extractRes = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: extractionPrompt,
        }),
      });

      const extractData = await extractRes.json();

      const rawJson =
        extractData.output_text ||
        extractData.output?.[0]?.content?.[0]?.text ||
        "{}";

      lead = JSON.parse(rawJson);
    } catch (extractError) {
      console.error("Lead extraction error:", extractError);
    }

    const latestMessage = message || "";

    const latestMessageHasContactInfo =
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(latestMessage) ||
      /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i.test(latestMessage);

    const readyToSendLead =
      lead.isLead &&
      latestMessageHasContactInfo &&
      (lead.email || lead.phone);

    if (readyToSendLead) {
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: lead.name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            company: lead.company || "",
            businessType: lead.businessType || "",
            needs: lead.needs || "",
            source: "EnAction.ai website chatbot",
            timestamp: new Date().toISOString(),
            transcript: userOnlyTranscript,
          }),
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
