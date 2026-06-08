export default function HelpPage() {
  return (
    <main className="section">
      <div className="container grid two">
        {[
          ["Can I cancel an order?", "Processing orders can be cancelled. High-value cancellations are checked by AgentGate."],
          ["Do you ship internationally?", "Not in this demo. Northstar lists domestic demo shipping only."],
          ["Can I return an item?", "Delivered orders may request a simulated return within 30 days."],
          ["Does this send real email?", "No. Receipt resend uses Email Preview and never sends real email."],
        ].map(([question, answer]) => (
          <section className="card" key={question}>
            <h2>{question}</h2>
            <p className="muted">{answer}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
