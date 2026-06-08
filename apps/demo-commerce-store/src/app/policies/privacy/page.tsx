export default function PrivacyPolicyPage() {
  return (
    <main className="section">
      <div className="container card">
        <p className="eyebrow">Policy</p>
        <h1>Privacy policy</h1>
        <p>This local demo stores JSON data in the repo working directory. It does not use tracking pixels, paid AI APIs, external processors, or real customer data.</p>
        <p className="muted">Customer data deletion requests are routed through AgentGate and intentionally blocked in V1 so the demo can prove safety controls without deleting local accounts.</p>
      </div>
    </main>
  );
}
