"use client";

import { FormEvent, useId, useState } from "react";
import { usePathname } from "next/navigation";

type Message = {
  role: "assistant" | "user";
  text: string;
};

const quickActions = [
  "Where is my order NS-1001? sarah@example.com",
  "Cancel my order NS-1002. My email is sarah@example.com.",
  "Can you resend my receipt for NS-1001 to sarah@example.com?",
  "What is your return policy?",
  "What backpacks do you sell?",
];

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I’m Northstar Assistant. I can answer product and policy questions, or help with demo order requests after AgentGate checks them.",
    },
  ]);
  const sessionId = `northstar-${useId().replaceAll(":", "")}`;

  if (pathname.startsWith("/admin")) {
    return null;
  }

  async function send(message: string) {
    if (!message.trim()) {
      return;
    }

    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: message }]);

    try {
      const response = await fetch("/api/agent/chat", {
        body: JSON.stringify({ message, sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as { reply?: string; agentGateDecision?: { actionRequestId?: string } };
      const actionLine = body.agentGateDecision?.actionRequestId
        ? `\n\nAgentGate action: ${body.agentGateDecision.actionRequestId}`
        : "";
      setMessages((current) => [
        ...current,
        { role: "assistant", text: `${body.reply ?? "I could not answer that."}${actionLine}` },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "The local demo assistant is unavailable right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <>
      {open ? (
        <section className="chat-panel" aria-label="Northstar Assistant">
          <div className="chat-head">
            <strong>Northstar Assistant</strong>
            <div style={{ color: "#cbded5", fontSize: 13 }}>
              Business actions route through AgentGate.
            </div>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
            {loading ? <div className="message assistant">Checking...</div> : null}
          </div>
          <div className="quick-actions">
            {quickActions.map((action) => (
              <button key={action} onClick={() => void send(action)} type="button">
                {action.split(".")[0]}
              </button>
            ))}
          </div>
          <form className="chat-form" onSubmit={onSubmit}>
            <input
              className="input"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about products or orders..."
              value={input}
            />
            <button className="button" disabled={loading} type="submit">
              Send
            </button>
          </form>
        </section>
      ) : null}
      <button
        aria-label={open ? "Close Northstar Assistant" : "Open Northstar Assistant"}
        className="chat-button"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "×" : "?"}
      </button>
    </>
  );
}
