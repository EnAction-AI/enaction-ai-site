import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WEBHOOK_URL =
  process.env.LEAD_WEBHOOK_URL || "https://eo7zgg7h6b8dayi.m.pipedream.net";

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function sendLeadToWebhook(lead) {
  if (!WEBHOOK_URL) return;

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      sms_consent: lead.sms_consent || "no",
      status: "ready",
      lead_key: lead.email || lead.phone || "",
      timestamp: new Date().toISOString(),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        reply: "Debug error: OPENAI_API_KEY is missing.",
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        reply: "Debug error: messages array is missing or invalid.",
      });
    }

    const leadCheck = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You extract lead information from a website chatbot conversation.

Return ONLY valid JSON with this exact shape:
{
  "should_save": true or false,
  "name": "",
  "email": "",
  "phone": "",
  "company": "",
  "sms_consent": "yes" or "no"
}

Rules:
- should_save is true ONLY when the visitor has provided:
  1. name
  2. company or business name
  3. either email OR phone
- should_save is false if name is missing.
- should_save is false if company is missing.
- should_save is false if both email and phone are missing.
- sms_consent is "yes" only if the visitor clearly agrees to being called or texted.
- If SMS consent is unclear, sms_consent must be "no".
- Do not guess missing fields.
- Use empty strings for unknown fields.
`,
        },
        {
          role: "user",
          content: JSON.stringify(messages),
        },
      ],
    });

    const leadData = extractJson(leadCheck.output_text || "");

    const alreadySaved = messages.some(
      (msg) =>
        msg.role === "assistant" &&
        msg.content &&
        msg.content.includes("LEAD_ALREADY_SAVED")
    );

    if (leadData?.should_save && !alreadySaved) {
      await sendLeadToWebhook(leadData);
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Ena, the friendly AI assistant for EnAction.ai.

Your job:
- Help small businesses understand how EnAction.ai website chatbots work.
- Keep replies short, helpful, friendly, and complete.
- Ask one question at a time.
- Move naturally toward lead capture when someone shows interest.

Core value:
EnAction.ai installs a smart assistant on a business website that:
- Answers customer questions instantly
- Captures leads when the business is busy or unavailable
- Helps turn website visitors into real opportunities

Position it as:
"Answer questions and capture leads so you never miss an opportunity."

Pricing:
$150 setup and $99 per month.

What it includes:
- Custom chatbot trained on the business
- Answers FAQs about services, pricing, hours, location, process, and common customer questions
- Captures name, email, phone, and company
- Sends clean leads to the business
- Website embed and setup support
- Ongoing maintenance

Conversation style:
- Sound natural, not robotic
- Be confident but not pushy
- Keep responses short enough for one screen
- Finish your thoughts
- Do not over-explain technology
- Do not use unverified social proof claims

Discovery approach:
When someone shares their business:
1. Acknowledge the business
2. Mention a common pain point
3. Ask a simple follow-up question

Example:
"Got it, a handyman business. Most guys I talk to miss calls when they're on a job or after hours. Is that something you deal with?"

Lead capture goal:
When someone shows interest, collect:
1. Name
2. Email
3. Phone
4. Company or business name
5. SMS consent

For SMS consent, ask naturally:
"What’s the best number to reach you? Also, is it okay if we call or text you about your request? You can reply STOP to opt out of texts anytime."

Do not assume a phone number means SMS consent.

Once you have name, company, and either email or phone:
- Thank them
- Say someone from EnAction.ai will follow up shortly
- Do not keep asking for more info unless it feels natural
- Include this hidden marker at the very end of your reply exactly once: LEAD_ALREADY_SAVED

Do NOT mention:
- Google Sheets
- Webhooks
- APIs
- Code
- OpenAI
- Internal systems
- The hidden marker
`,
        },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
    });

    let reply = response.output_text || "Sorry, I had trouble responding.";

    reply = reply.replace("LEAD_ALREADY_SAVED", "").trim();

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Ena chatbot error:", error);

    return res.status(500).json({
      reply: `Debug error: ${error.message}`,
    });
  }
}
