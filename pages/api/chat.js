// EnAction chatbot backend — Phase 4.
// Drop-in replacement for pages/api/chat.js in github.com/EnAction-AI/enaction-ai-site
//
// Everything the bot did before is preserved. What's new:
//   1. a bot id + conversation id travel with every request
//   2. the EnAction portal is asked whether this business may chat, BEFORE OpenAI
//   3. the conversation and any lead are saved in the EnAction portal
//   4. the Pipedream / Google Sheets send happens at most once per conversation,
//      decided by the portal's database rather than by anything stored here
//
// Environment variables:
//   OPENAI_API_KEY                       (existing)
//   LEAD_WEBHOOK_URL                     (existing)
//   OPENAI_MODEL                         (new, single model setting)
//   ENACTION_API_URL                     (new, e.g. https://enaction.ai)
//   ENACTION_INGEST_KEY                  (new, shared secret)
//   ENACTION_BOT_ID                      (new, bot id for EnAction's own site)
//   ENACTION_PORTAL_INTEGRATION_ENABLED  (new, "true" in production; "false" = temporary rollback)

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const WEBHOOK_URL =
  process.env.LEAD_WEBHOOK_URL || "https://eo7zgg7h6b8dayi.m.pipedream.net";

const PORTAL_URL = process.env.ENACTION_API_URL || "";
const PORTAL_KEY = process.env.ENACTION_INGEST_KEY || "";
const DEFAULT_BOT_ID = process.env.ENACTION_BOT_ID || "";
// Explicit switch. Only the literal string "false" turns the integration off.
const PORTAL_ENABLED = String(process.env.ENACTION_PORTAL_INTEGRATION_ENABLED).toLowerCase() !== "false";

// Neutral fallback only. This is a shared multi-client engine, so it must never
// default to one client's agent name. Every business's real agent name comes
// from the portal session lookup, resolved from its bot id — EnAction.ai's own
// site resolves "Ena" from the enaction-main client record.
const DEFAULT_AGENT_NAME = "AI Agent";

const UNAVAILABLE_MESSAGE =
  "We're sorry, but the chat service is temporarily unavailable right now. Please try again later or contact the business directly for assistance.";

// Plain-text incremental body. No buffering anywhere in front of it.
const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function portalPost(path, payload) {
  if (!PORTAL_URL || !PORTAL_KEY) {
    console.error("[enaction] configuration error: ENACTION_API_URL or ENACTION_INGEST_KEY is missing");
    return { ok: false, configError: true };
  }
  try {
    const res = await fetch(`${PORTAL_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-enaction-key": PORTAL_KEY },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[enaction] ${path} failed [${res.status}]`, data && data.error);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, data };
  } catch (error) {
    console.error(`[enaction] ${path} request error:`, error.message);
    return { ok: false, networkError: true };
  }
}

// Sends the lead to Pipedream exactly as before, then reports the outcome back
// to the portal so the send is recorded (or the claim released for a retry).
async function sendLeadToWebhook(lead, leadId) {
  let delivered = false;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    delivered = res.ok;
    if (!res.ok) console.error(`[enaction] pipedream webhook failed [${res.status}]`);
  } catch (error) {
    console.error("[enaction] pipedream webhook error:", error.message);
  }

  if (leadId) {
    await portalPost("/api/public/agent/pipedream-complete", {
      lead_id: leadId,
      outcome: delivered ? "sent" : "failed",
    });
  }
  return delivered;
}

// A lead needs name + company + (email OR phone). When the conversation so far
// contains neither an email address nor anything phone-shaped, the extraction
// call cannot possibly return should_save: true, so it is skipped. The moment
// either appears it runs exactly as before.
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(?:\+?\d[\s().-]?){7,}/;

function couldQualify(messages) {
  const text = messages
    .filter((m) => m && m.role === "user" && typeof m.content === "string")
    .map((m) => m.content)
    .join("\n");
  return EMAIL_RE.test(text) || PHONE_RE.test(text);
}

const LEAD_EXTRACTION_INSTRUCTIONS = `
You extract lead information from a conversation between a website visitor and an AI website agent.

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
`;

function replyInstructions(agentName) {
  return `
You are ${agentName}, the friendly AI website agent powered by EnAction.ai.

Your job:
- Help small businesses understand how the EnAction platform and ${agentName} work together.
- Keep replies short, helpful, friendly, and complete.
- Ask one question at a time.
- Move naturally toward lead capture when someone shows interest.

Your name:
- Always introduce yourself as ${agentName}.
- Never call yourself by any other name.

Product distinction:
- EnAction.ai is the website lead engagement and management platform.
- ${agentName} is the AI website agent that visitors interact with.
- Never define the entire EnAction product as a chatbot or chatbot service.

Core value — Engage. Capture. Manage.:
- ENGAGE: ${agentName} answers questions about the business 24/7, learns what the visitor needs, and guides them toward the appropriate next step.
- CAPTURE: ${agentName} naturally collects lead information and preserves the conversation context so potential opportunities are not lost.
- MANAGE: Leads and conversations appear in the EnAction dashboard, where the business can review conversations, update lead statuses, add notes, and organize opportunities for follow-up.

Website setup and installation:
- EnAction provides a small piece of code for the customer's website.
- The customer or their website provider adds the code to the site.
- EnAction helps with the AI agent setup and configuration.
- If EnAction has appropriate website access, EnAction may assist with installation.
- Never promise or imply that EnAction always installs the code directly.

Primary positioning:
"Turn website conversations into customers."

Supporting message:
"EnAction gives your business an AI website agent that answers questions, captures leads, and keeps every opportunity organized in one simple dashboard."

Pricing:
$99.99 per month with no setup fee.

What it includes:
- A custom AI website agent trained on the business
- Answers FAQs about services, pricing, hours, location, process, and common customer questions
- Captures name, email, phone, and company
- Preserves lead details and conversation context in the EnAction dashboard
- Lead status tracking and notes for organized follow-up
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
"What's the best number to reach you? Also, is it okay if we call or text you about your request? You can reply STOP to opt out of texts anytime."

Do not assume a phone number means SMS consent.

Once you have name, company, and either email or phone:
- Thank them
- Say someone from EnAction.ai will follow up shortly
- Do not keep asking for more info unless it feels natural

Do NOT mention:
- Google Sheets
- Webhooks
- APIs
- Code
- OpenAI
- Internal systems
`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const t0 = Date.now();
  const ms = () => Date.now() - t0;
  // Durations only. No message text, no keys, no personal details.
  const timing = {};
  let streaming = false;

  try {
    const {
      messages,
      bot_id: bodyBotId,
      conversation_id: bodyConversationId,
      // Admin test conversation from the EnAction portal. The status gate and the
      // agent name lookup still run exactly as normal; nothing is stored and
      // nothing is forwarded to Pipedream / Google Sheets.
      preview: bodyPreview,
      // Opt-in streaming. Without it the response contract is unchanged.
      stream: bodyStream,
    } = req.body;
    const isPreview = bodyPreview === true;
    const wantsStream = bodyStream === true;

    if (!process.env.OPENAI_API_KEY) {
      console.error("[enaction] configuration error: OPENAI_API_KEY is missing");
      return res.status(200).json({ reply: UNAVAILABLE_MESSAGE });
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ reply: "Sorry, I had trouble responding." });
    }

    const botId = (bodyBotId || DEFAULT_BOT_ID || "").trim();
    const conversationId = (bodyConversationId || "").trim();

    // ---- 1. service gate, before any OpenAI call -------------------------
    // The same gate also returns this business's configured agent name, so one
    // shared engine serves every client without per-client files.
    let agentName = DEFAULT_AGENT_NAME;
    if (PORTAL_ENABLED) {
      const gateStart = Date.now();
      const gate = await portalPost("/api/public/agent/session", { bot_id: botId });
      timing.gate_ms = Date.now() - gateStart;
      // A configuration problem, a portal failure, or a blocked business all
      // stop here. We never quietly skip the status check.
      if (!gate.ok || !gate.data || gate.data.allowed !== true) {
        console.log(JSON.stringify({ evt: "chat", blocked: true, ...timing, total_ms: ms() }));
        if (wantsStream) {
          res.writeHead(200, STREAM_HEADERS);
          res.write(UNAVAILABLE_MESSAGE);
          return res.end();
        }
        return res.status(200).json({ reply: UNAVAILABLE_MESSAGE });
      }
      const configured = typeof gate.data.agent_name === "string" ? gate.data.agent_name.trim() : "";
      if (configured) agentName = configured;
    }

    // ---- 2. lead extraction — off the visitor's waiting path --------------
    // Started here but NOT awaited: it runs alongside the reply instead of in
    // front of it. Same model, same instructions, same qualification rules.
    const extractionStart = Date.now();
    const skipExtraction = !couldQualify(messages);
    timing.lead_extract_skipped = skipExtraction;
    const leadPromise = skipExtraction
      ? Promise.resolve(null)
      : client.responses
          .create({
            model: MODEL,
            input: [
              { role: "system", content: LEAD_EXTRACTION_INSTRUCTIONS },
              { role: "user", content: JSON.stringify(messages) },
            ],
          })
          .then((out) => {
            timing.lead_extract_ms = Date.now() - extractionStart;
            return extractJson(out.output_text || "");
          })
          .catch((error) => {
            console.error("[enaction] lead extraction failed:", error.message);
            timing.lead_extract_ms = Date.now() - extractionStart;
            return null;
          });

    // ---- 3. reply ---------------------------------------------------------
    const replyInput = [
      { role: "system", content: replyInstructions(agentName) },
      ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const replyStart = Date.now();
    let reply = "";

    if (wantsStream) {
      streaming = true;
      res.writeHead(200, STREAM_HEADERS);
      const events = await client.responses.create({
        model: MODEL,
        input: replyInput,
        stream: true,
      });
      for await (const event of events) {
        if (event.type === "response.output_text.delta" && event.delta) {
          if (reply === "") timing.first_text_ms = Date.now() - replyStart;
          reply += event.delta;
          res.write(event.delta);
        }
      }
      reply = reply.replace("LEAD_ALREADY_SAVED", "").trim();
      if (!reply) {
        reply = "Sorry, I had trouble responding.";
        res.write(reply);
      }
      // The visitor now has the complete answer. Everything below still runs
      // inside this request — awaited, never fire-and-forget — so no lead and
      // no conversation can be lost, and Sheets stays deduplicated.
      res.end();
    } else {
      const response = await client.responses.create({ model: MODEL, input: replyInput });
      reply = (response.output_text || "Sorry, I had trouble responding.")
        .replace("LEAD_ALREADY_SAVED", "")
        .trim();
    }
    timing.reply_ms = Date.now() - replyStart;

    // ---- 4. save to the portal, then Pipedream if (and only if) granted ---
    // A preview skips this step entirely: no conversation row, no lead row, no
    // Pipedream claim and no Google Sheets row can be created by a test chat.
    if (isPreview) {
      console.log(JSON.stringify({ evt: "chat", preview: true, ...timing, total_ms: ms() }));
      return streaming ? undefined : res.status(200).json({ reply });
    }

    const leadData = await leadPromise;

    if (PORTAL_ENABLED && conversationId) {
      const ingestStart = Date.now();
      const ingest = await portalPost("/api/public/agent/ingest", {
        bot_id: botId,
        conversation_id: conversationId,
        messages: [...messages, { role: "assistant", content: reply }],
        lead: leadData && leadData.should_save ? leadData : null,
      });
      timing.ingest_ms = Date.now() - ingestStart;

      const grant = ingest.ok && ingest.data ? ingest.data.pipedream : null;
      if (grant && grant.send) {
        const hookStart = Date.now();
        await sendLeadToWebhook(leadData, grant.lead_id);
        timing.webhook_ms = Date.now() - hookStart;
      }
    } else if (leadData && leadData.should_save && !PORTAL_ENABLED) {
      // Rollback mode only: legacy behaviour, portal not involved.
      await sendLeadToWebhook(leadData, null);
    }

    console.log(JSON.stringify({ evt: "chat", streamed: streaming, ...timing, total_ms: ms() }));
    return streaming ? undefined : res.status(200).json({ reply });
  } catch (error) {
    console.error("EnAction agent error:", error.message);
    if (streaming) {
      try {
        if (!res.writableEnded) res.end();
      } catch {}
      return undefined;
    }
    if (res.headersSent) return undefined;
    return res.status(200).json({ reply: "Sorry, I had trouble responding. Please try again." });
  }
}
