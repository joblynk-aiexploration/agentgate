"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Message = {
  role: "assistant" | "user";
  text: string;
  debug?: {
    decision?: string;
    riskLevel?: string;
    actionRequestId?: string;
    approvalRequestId?: string;
  };
};

type SessionState = {
  loggedIn: boolean;
  customer: { name: string; email: string } | null;
  cartCount: number;
};

const quickActions = [
  "Cancel my latest order.",
  "Where is my latest order?",
  "Can you resend my receipt for my latest order?",
  "What is your return policy?",
  "What backpacks do you sell?",
];

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionId] = useState(() => `northstar-${Math.random().toString(16).slice(2)}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I’m Northstar Assistant. I can help with products, policies, tracking, receipts, and checkout-created orders. Requests that change an order go through AgentGate first.",
    },
  ]);

  useEffect(() => {
    void fetch("/api/customer/session")
      .then((response) => response.json())
      .then((body: SessionState) => setSession(body))
      .catch(() => setSession(null));
  }, [pathname]);

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
      const body = (await response.json()) as {
        reply?: string;
        agentGateDecision?: {
          decision?: string;
          riskLevel?: string;
          actionRequestId?: string;
          approvalRequestId?: string;
        };
      };

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: body.reply ?? "I could not answer that.",
          debug: body.agentGateDecision,
        },
      ]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "The local demo assistant is unavailable right now." }]);
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
              {session?.loggedIn && session.customer
                ? `Order-aware support for ${session.customer.email}.`
                : "For order help, log in or provide order number and email."}
            </div>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <div>{message.text}</div>
                {message.debug?.decision ? (
                  <div className="debug-box">
                    <div>Decision: {message.debug.decision}</div>
                    <div>Risk: {message.debug.riskLevel ?? "n/a"}</div>
                    {message.debug.actionRequestId ? <div>Action: {message.debug.actionRequestId}</div> : null}
                    {message.debug.approvalRequestId ? <div>Approval: {message.debug.approvalRequestId}</div> : null}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? <div className="message assistant">Checking...</div> : null}
          </div>
          <div className="quick-actions">
            {quickActions.map((action) => (
              <button key={action} onClick={() => void send(action)} type="button">
                {action}
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
        {open ? "x" : "?"}
      </button>
    </>
  );
}
