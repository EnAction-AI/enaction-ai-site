export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center px-6">
      <main className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">
          EnAction.ai
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          We’re rebuilding our website and AI agent experience.
        </p>

        <p className="text-gray-500 mb-8">
          EnAction.ai helps small businesses turn website visitors into leads,
          conversations, and booked opportunities through smart AI chatbots and agents.
        </p>

        <a
          href="mailto:hello@enaction.ai"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
        >
          Contact Us
        </a>
      </main>
    </div>
  );
}
