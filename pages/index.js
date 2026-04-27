import { useState } from "react";

export default function HomePage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi, I’m Ena. Ask me what EnAction.ai can do for your business.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || "Sorry, I had trouble replying.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong connecting to Ena.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 px-6 py-12">
      <main className="max-w-3xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-4">EnAction.ai</h1>

        <p className="text-xl text-gray-600 mb-6">
          We are rebuilding our website and AI agent experience.
        </p>

        <p className="text-gray-500 mb-10">
          EnAction.ai helps small businesses turn website visitors into leads,
          conversations, and booked opportunities through smart AI chatbots and agents.
        </p>

        <div className="max-w-xl mx-auto bg-gray-50 border rounded-2xl shadow p-4 text-left">
          <div className="font-semibold text-blue-600 mb-3">Test Ena Bot</div>

          <div className="h-80 overflow-y-auto bg-white border rounded-xl p-4 mb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className={`inline-block px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.content}
                </span>
              </div>
            ))}

            {loading && (
              <div className="text-sm text-gray-400">Ena is thinking...</div>
            )}
          </div>

          <div className="flex">
            <input
              className="flex-grow border rounded-l-xl px-3 py-2 text-sm focus:outline-none"
              placeholder="Ask Ena a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-xl font-medium"
            >
              Send
            </button>
          </div>
        </div>

        <a
          href="mailto:hello@enaction.ai"
          className="inline-block mt-8 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
        >
          Contact Us
        </a>
      </main>
    </div>
  );
}
