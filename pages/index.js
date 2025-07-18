import { useState, useEffect, useRef } from "react";

export default function HomePage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi there! I’m Ena — your AI assistant for EnAction.ai. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const placeholderReply = {
      role: "assistant",
      content: "Thinking...",
      loading: true,
    };

    setMessages((prev) => [...prev, userMessage, placeholderReply]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, threadId }),
      });

      const data = await res.json();

      if (data.response) {
        const lines = data.response.split(/\n{2,}/);
        const replies = lines
          .map((line) => ({ role: "assistant", content: line.trim() }))
          .filter((r) => r.content);

        setMessages((prev) => [...prev.slice(0, -1), ...replies]);
        setThreadId(data.threadId);

        if (
          data.response.toLowerCase().includes("thanks") &&
          data.response.toLowerCase().includes("info")
        ) {
          const demoIntro = {
            role: "assistant",
            content:
              "Let me show you a quick demo. Imagine this is the assistant on *your* website, trained on your business details:",
          };
          const demoFlow = [
            {
              role: "assistant",
              content:
                "👋 Hi there! Welcome to [Your Business Name]. I'm your virtual assistant. How can I help you today?",
            },
            {
              role: "assistant",
              content:
                "Here are a few things I can help with:\n• 📞 Booking a call\n• 🕒 Checking hours\n• 📍 Finding your nearest location\n• 🤔 Answering FAQs",
            },
            {
              role: "assistant",
              content:
                "When EnAction builds your chatbot, it will know your services, contact details, hours, and more — all tailored to your business.",
            },
            {
              role: "assistant",
              content:
                "Would you like to book a real walkthrough with someone from our team or ask anything else?",
            },
          ];

          setMessages((prev) => [...prev, demoIntro, ...demoFlow]);
        }
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Sorry, I didn’t get a reply." },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Sorry, something went wrong talking to Ena." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <header className="text-center py-10">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-blue-500">E</span>
          <span className="text-gray-700">n</span>
          <span className="text-blue-500">A</span>
          <span className="text-gray-700">ction</span>
          <span className="text-blue-500">.ai</span>
        </h1>
        <p className="text-lg max-w-xl mx-auto">
          Smart AI chatbots for small businesses — answering questions, capturing leads, and automating bookings 24/7.
        </p>
      </header>

      <section className="py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-gray-100 p-6 rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-2">Lead Capture Bots</h3>
            <p>Engage visitors instantly and gather their contact info while answering their most common questions.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-2">Booking Bots</h3>
            <p>Let customers schedule calls, consultations, or appointments directly from the chat — even after hours.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-2xl shadow">
            <h3 className="text-xl font-semibold mb-2">Tiered AI Options</h3>
            <p>Choose from simple button-based flows or intelligent GPT-powered bots customized for your business.</p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-blue-50 text-center">
        <h2 className="text-3xl font-bold mb-4">Let’s Bring AI to Your Business</h2>
        <p className="mb-6">
          QR codes. Website embeds. Facebook Messenger. However they find you, we’ll help convert them.
        </p>
        <a
          href="mailto:hello@enaction.ai"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-2xl text-lg font-medium shadow hover:bg-blue-700"
        >
          Get Started
        </a>
      </section>

      {/* 💬 Chatbot UI */}
      <div className="fixed bottom-6 right-6 w-96 max-w-full p-0 rounded-xl shadow-2xl border-2 border-blue-500 bg-white flex flex-col overflow-hidden z-50">
        {/* Header */}
        <div className="bg-blue-500 text-white text-center font-semibold py-2 text-lg">
          Enaction.AI
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto px-4 py-3 border-b">
          {messages.map((msg, i) => (
            <div key={i} className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <span
                className={`inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </span>
            </div>
          ))}
          {loading && (
            <div className="text-left text-sm text-gray-400 animate-pulse">
              Ena is typing<span className="animate-bounce">...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input */}
        <div className="flex p-3">
          <input
            type="text"
            className="flex-grow border rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask Ena a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>

      <footer className="text-center py-10 text-sm text-gray-500">
        © {new Date().getFullYear()} EnAction.ai. All rights reserved.
      </footer>
    </div>
  );
}
