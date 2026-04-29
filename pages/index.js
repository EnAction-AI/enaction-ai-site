import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I’m Ena. I help small businesses turn website visitors into leads, bookings, and follow-ups. What kind of business do you run?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply || "Sorry, I had trouble responding. Please try again.",
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
          <a href="#features" className="hover:text-[#2563eb]">Features</a>
          <a href="#how" className="hover:text-[#2563eb]">How It Works</a>
          <a href="#pricing" className="hover:text-[#2563eb]">Pricing</a>
          <a href="#faq" className="hover:text-[#2563eb]">FAQ</a>
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
            AI website chatbots for small businesses
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">
            Turn website visitors into leads, bookings, and follow-ups.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            EnAction.ai builds smart website chatbots that answer questions,
            capture contact info, help customers take action, and make your
            business easier to reach 24/7.
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
            <Stat number="24/7" label="Answers" />
            <Stat number="Lead" label="Capture" />
            <Stat number="Easy" label="Setup" />
          </div>
        </div>

        <div id="demo" className="relative">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-blue-200 blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-purple-200 blur-3xl"></div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-6 py-5 text-white">
              <div className="text-sm opacity-90">Live Demo</div>
              <div className="text-xl font-bold">Chat with Ena</div>
            </div>

            <div className="h-[440px] overflow-y-auto bg-slate-50 p-5">
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

                <div ref={chatEndRef} />
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
          <SectionHeader
            eyebrow="Features"
            title="Everything your website needs to start conversations."
            text="Ena helps visitors get answers, while helping your business collect better leads and follow up faster."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Feature
              title="Answers FAQs"
              text="Trained on your services, hours, pricing details, process, and common customer questions."
            />
            <Feature
              title="Captures Leads"
              text="Collects name, email, phone, business name, and other details when visitors show interest."
            />
            <Feature
              title="Books More Calls"
              text="Guides visitors toward scheduling, requesting a quote, or starting the next step."
            />
            <Feature
              title="Works 24/7"
              text="Your website can respond instantly, even when your team is busy, closed, or on a job."
            />
            <Feature
              title="Custom to Your Business"
              text="Every bot is built around your company, your voice, your offers, and your customer journey."
            />
            <Feature
              title="Lead Tracking"
              text="Leads can be sent to a Google Sheet so you have a simple place to manage follow-up."
            />
          </div>
        </div>
      </section>

      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="How it works"
            title="Simple setup. No complicated tech."
            text="We handle the chatbot build so you can focus on running your business."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step number="01" title="Share your business info" text="Send your website, services, FAQs, contact info, and goals." />
            <Step number="02" title="We build your bot" text="We create your custom chatbot and connect your lead capture system." />
            <Step number="03" title="Go live" text="Add the chatbot to your website and start capturing more opportunities." />
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            eyebrow="Pricing"
            title="Simple pricing for small businesses."
            text="Affordable setup and monthly support without making things complicated."
          />

          <div className="mx-auto mt-12 max-w-md rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-8 shadow-xl">
            <div className="text-sm font-semibold uppercase tracking-wide text-[#2563eb]">
              Website Chatbot
            </div>

            <div className="mt-4 flex items-end gap-2">
              <div className="text-5xl font-extrabold text-slate-950">$75</div>
              <div className="pb-2 text-slate-500">/ month</div>
            </div>

            <div className="mt-2 text-slate-600">$100 setup fee</div>

            <ul className="mt-8 space-y-4 text-sm text-slate-700">
              <li>✓ Custom website chatbot</li>
              <li>✓ FAQ and business training</li>
              <li>✓ Lead capture</li>
              <li>✓ Google Sheet lead tracking</li>
              <li>✓ Website embed support</li>
              <li>✓ Ongoing maintenance</li>
            </ul>

            <a
              href="mailto:support@enaction.ai"
              className="mt-8 block rounded-full bg-[#2563eb] px-6 py-4 text-center font-semibold text-white hover:bg-[#1d4ed8]"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeader
            eyebrow="FAQ"
            title="Questions business owners usually ask."
            text="Here are a few quick answers before we talk."
          />

          <div className="mt-10 space-y-4">
            <FAQ
              question="Will the chatbot know my business?"
              answer="Yes. Your bot is built around your services, FAQs, hours, location, contact info, and customer process."
            />
            <FAQ
              question="Where do leads go?"
              answer="Leads can be sent to a Google Sheet so your team has a simple place to review and follow up."
            />
            <FAQ
              question="Can this help with missed calls and texts?"
              answer="Yes. Ena can answer website visitors instantly and collect their contact info so you can follow up when available."
            />
            <FAQ
              question="Do I need to know how to code?"
              answer="No. We help with setup and provide the embed code for your website."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#0f172a] py-20 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Ready to turn your website into a lead capture tool?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Try the demo, tell Ena what kind of business you run, and see how a
            custom chatbot could work on your website.
          </p>

          <a
            href="#demo"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 font-semibold text-slate-950 hover:bg-slate-100"
          >
            Try the Demo
          </a>
        </div>
      </section>

      <footer className="bg-[#0f172a] px-6 pb-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} EnAction.ai. All rights reserved.
      </footer>
    </main>
  );
}

function Stat({ number, label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-xl font-bold text-slate-950">{number}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="text-sm font-bold uppercase tracking-wider text-[#2563eb]">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-8 text-slate-600">{text}</p>
    </div>
  );
}

function Feature({ title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">
        ✦
      </div>
      <h3 className="text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="text-sm font-bold text-[#2563eb]">{number}</div>
      <h3 className="mt-4 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function FAQ({ question, answer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-bold text-slate-950">{question}</h3>
      <p className="mt-2 leading-7 text-slate-600">{answer}</p>
    </div>
  );
}
