import { useState, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I’m Ena, the EnAction AI website agent. I help small businesses turn website conversations into customers. What kind of business do you run?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // One conversation id per browser tab visit. It survives re-renders and
  // page navigation within the same visit, and a fresh visit starts fresh.
  const [conversationId] = useState(() => {
    if (typeof window === "undefined") return "";
    const KEY = "enaction_conversation_id";
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  });

  useEffect(() => {
    const chatBox = document.getElementById("chat-messages");
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversation_id: conversationId,
          bot_id: process.env.NEXT_PUBLIC_ENACTION_BOT_ID || "",
        }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            data.reply || "Sorry, I had trouble responding. Please try again.",
        },
      ]);
    } catch (error) {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    }

    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#0f172a]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-2xl font-bold tracking-tight text-[#2563eb]">
          EnAction.ai
        </div>

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-[#2563eb]">
            Features
          </a>
          <a href="#how" className="hover:text-[#2563eb]">
            How It Works
          </a>
          <a href="#pricing" className="hover:text-[#2563eb]">
            Pricing
          </a>
          <a href="#faq" className="hover:text-[#2563eb]">
            FAQ
          </a>
        </div>

        <a
          href="#demo"
          className="rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-[#1d4ed8]"
        >
          Book a Demo
        </a>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-2 md:pt-20">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-[#2563eb] shadow-sm">
            Website lead engagement and management
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">
            Turn website conversations into customers.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            EnAction gives your business an AI website agent that answers
            questions, captures leads, and keeps every opportunity organized
            in one simple dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="#demo"
              className="rounded-full bg-[#2563eb] px-7 py-4 text-center font-semibold text-white shadow-lg shadow-blue-200 hover:bg-[#1d4ed8]"
            >
              Try the Demo
            </a>

            <a
              href="#features"
              className="rounded-full border border-slate-200 bg-white px-7 py-4 text-center font-semibold text-slate-800 shadow-sm hover:border-blue-200"
            >
              See How It Works
            </a>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            <Stat number="Engage" label="24/7" />
            <Stat number="Capture" label="With context" />
            <Stat number="Manage" label="In EnAction" />
          </div>
        </div>

        <div id="demo" className="relative scroll-mt-10">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-blue-200 blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-purple-200 blur-3xl"></div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-6 py-5 text-white">
              <div className="text-sm opacity-90">Live Demo</div>
              <div className="text-xl font-bold">Chat with Ena</div>
            </div>

            <div
              id="chat-messages"
              className="h-[440px] overflow-y-auto bg-slate-50 p-5"
            >
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#2563eb] text-white"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white p-4">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border border-slate-200 px-5 py-3 text-sm outline-none focus:border-[#2563eb]"
                />

                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Engage. Capture. Manage.
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Ena handles the conversation. EnAction keeps every opportunity organized.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Feature
               title="Engage"
               description="Ena answers questions 24/7, learns what each visitor needs, and guides them toward the right next step."
            />
            <Feature
               title="Capture"
               description="Ena naturally collects lead details and preserves the conversation context, so opportunities aren't lost."
            />
            <Feature
               title="Manage"
               description="Review conversations, update lead statuses, add notes, and keep every opportunity organized for follow-up."
            />
          </div>
        </div>
      </section>

      <section id="how" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              How it works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Step
              number="1"
              title="We learn your business"
              description="You share your services, FAQs, tone, and what a good lead looks like."
            />
            <Step
              number="2"
              title="Add Ena to your website"
              description="We provide a small piece of code. You or your website provider add it to the site, and we help with setup and configuration."
            />
            <Step
              number="3"
               title="Manage opportunities in EnAction"
               description="Leads and conversation context appear in your dashboard, ready for statuses, notes, and follow-up."
            />
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            One plan. Everything included. No setup fee.
          </p>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl md:p-12">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              EnAction Platform
            </div>
            <div className="mt-4 flex items-baseline justify-center">
              <span className="text-6xl font-extrabold text-slate-950">
                $99.99
              </span>
              <span className="ml-2 text-lg text-slate-600">/month</span>
            </div>
            <ul className="mt-8 space-y-3 text-left text-slate-600 md:mx-auto md:max-w-md">
              <ListItem>Ena AI website agent trained on your business</ListItem>
              <ListItem>Lead capture with conversation context</ListItem>
              <ListItem>Lead management dashboard, statuses, and notes</ListItem>
              <ListItem>Website embed and setup support</ListItem>
              <ListItem>Unlimited conversations</ListItem>
              <ListItem>Ongoing maintenance and updates</ListItem>
            </ul>
            <a
              href="#demo"
              className="mt-8 inline-block rounded-full bg-[#2563eb] px-8 py-4 font-semibold text-white shadow-lg shadow-blue-200 hover:bg-[#1d4ed8]"
            >
              Try the Demo
            </a>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Frequently asked questions
          </h2>

          <div className="space-y-6">
            <FAQ
              q="Will this replace my website?"
               a="No. Ena is added to your existing website as a small chat widget."
            />
            <FAQ
              q="Do I need technical skills?"
              a="No. We provide the code and help with setup and configuration. You or your website provider add it to your site, and we may assist if we have the right website access."
            />
            <FAQ
              q="What happens to the leads?"
              a="They’re captured with contact details and sent to you so you can follow up."
            />
            <FAQ
               q="Can I change what Ena says?"
               a="Yes. We work with you to set the right tone, answers, and lead capture flow."
            />
          </div>
        </div>
      </section>

      <footer className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} EnAction.ai. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

function Stat({ number, label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-[#2563eb]">{number}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
    </div>
  );
}

function Feature({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}

function ListItem({ children }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className="mt-1 h-5 w-5 shrink-0 text-[#2563eb]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        ></path>
      </svg>
      <span>{children}</span>
    </li>
  );
}

function FAQ({ q, a }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-950">{q}</h3>
      <p className="mt-2 text-slate-600">{a}</p>
    </div>
  );
}
