export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, threadId } = req.body;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

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
          'Content-Type': 'application/json'
        }
      });

      const threadData = await threadRes.json();
      thread = threadData.id;
      console.log("✅ Thread created:", thread);
    }

    // Step 2: Add message to thread
    const messageRes = await fetch(`https://api.openai.com/v1/threads/${thread}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: "user",
        content: message
      })
    });

    console.log("✅ Message sent");

    // Step 3: Run the assistant
    const runRes = await fetch(`https://api.openai.com/v1/threads/${thread}/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      })
    });

    const runData = await runRes.json();
    console.log("✅ Run started:", runData.id);

    // Step 4: Poll until the run completes
    let runStatus;
    do {
      await new Promise(r => setTimeout(r, 1000));
      const runStatusRes = await fetch(`https://api.openai.com/v1/threads/${thread}/runs/${runData.id}`, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      runStatus = await runStatusRes.json();
      console.log("⏳ Polling run status:", runStatus.status);
    } while (runStatus.status !== 'completed');

    // Step 5: Get assistant's message
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${thread}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const messagesData = await messagesRes.json();
    const reply = messagesData.data[0]?.content?.[0]?.text?.value;

    console.log("✅ Assistant reply:", reply);
    res.status(200).json({ response: reply, threadId: thread });
  } catch (e) {
    console.error("🔥 API error:", e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}
