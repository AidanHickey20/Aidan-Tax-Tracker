"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TaxAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tax-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages([...updated, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages([...updated, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Failed to connect. Please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-8 flex flex-col" style={{ height: "420px" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        <h3 className="font-semibold text-slate-700">RE Tax Advisor</h3>
        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">PRO</span>
        <span className="text-xs text-slate-400 ml-1">AI-powered tax strategy assistant</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-4">Ask me about tax strategies for real estate professionals</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "What can I write off as a RE professional?",
                "Should I elect S-Corp status?",
                "How do I qualify for REPS?",
                "Best retirement accounts for self-employed?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-full px-3 py-1.5 text-slate-600 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-50 text-slate-800 border border-slate-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-6 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about tax strategies..."
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg px-3 py-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
