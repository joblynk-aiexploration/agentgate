import { PageHeader } from "@/components/ui/page-header";

const faqs = [
  ["Can I cancel an order?", "Processing orders can be cancelled. High-value or sensitive cancellations are checked by AgentGate before the local order changes."],
  ["How do I track my order?", "Use Order Lookup with the matching order number and email, or sign in and open Account Tracking."],
  ["Can I return an item?", "Delivered demo orders may request a simulated return within 30 days. No real labels or refunds are generated."],
  ["Does receipt resend send real email?", "No. Receipt resend uses preview records only and is still checked by AgentGate when appropriate."],
  ["What can the assistant answer?", "It can answer catalog, policy, and order-status questions from local data. Business-changing requests go through AgentGate."],
  ["Is this real ecommerce?", "No. This is a local demo store for proving AgentGate control over AI support actions."],
];

export default function HelpPage() {
  return (
    <main className="section">
      <div className="container">
        <PageHeader eyebrow="Help center" title="Northstar support" description="Professional support copy for a local ecommerce demo. The assistant is available from the lower-right chat button." />
        <div className="grid two">
          {faqs.map(([question, answer]) => (
            <section className="card" key={question}>
              <h2>{question}</h2>
              <p className="muted">{answer}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
