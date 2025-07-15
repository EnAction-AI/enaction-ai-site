export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, threadId } = req.body;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
  const WEBHOOK_URL = "https://eo7zgg7h6b8dayi.m.pipedream.net";

  if (!OPENAI_API_KEY || !ASSISTANT_ID) {
    console.error("❌ Missing API credentials");
    return res.status(500).json({ error: 'Missing API credentials' });
  }

  try {
    // Step 1: Create thread if needed
    let thread = threadId;
    if (!thread) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json',
        },
      });
      const threadData = await threadRes.json();
      thread = threadData.id;
    }

    // Step 2: Add message to thread
    await fetch(`https://api.openai.com/v1/threads/${thread}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: "user", content: message }),
    });

    // Step 3: Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
    });

    const runData = await runRes.json();

    // Step 4: Poll for completion
    let runStatus;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${thread}/runs/${runData.id}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      runStatus = await statusRes.json();
    } while (runStatus.status !== 'completed');

    // Step 5: Get the assistant reply
    const msgRes = await fetch(`https://api.openai.com/v1/threads/${thread}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const messagesData = await msgRes.json();
    const reply = messagesData.data[0]?.content?.[0]?.text?.value || "Sorry, no reply found.";

    // Step 6: Try to extract lead info
    const nameMatch = message.match(/name is (\w+)/i);
    const emailMatch = message.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    const phoneMatch = message.match(/(\+?\d{10,})/);
    const companyMatch = message.match(/(?:at|from)\s([A-Z][a-zA-Z0-9& ]+)/i);

    const lead = {
      name: nameMatch?.[1] || "",
      email: emailMatch?.[0] || "",
      phone: phoneMatch?.[1] || "",
      company: companyMatch?.[1] || "",
      message,
      timestamp: new Date().toISOString(),
    };

    // Step 7: Only send to webhook if some lead info is present
    if (lead.name || lead.email || lead.phone || lead.company) {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    }

    res.status(200).json({ response: reply, threadId: thread });
  } catch (e) {
    console.error("🔥 API error:", e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}
