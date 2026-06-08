import { Badge } from "@/components/ui/badge";

export default function AdminLoginPage() {
  return (
    <main className="section">
      <div className="container grid two">
        <form className="card form" method="post" action="/api/admin/login">
          <Badge tone="info">Admin workspace</Badge>
          <h1>Northstar admin login</h1>
          <p className="muted">Manage local orders, fulfillment, tracking events, products, customers, and AgentGate support-agent activity.</p>
          <label>Email<input className="input" name="email" type="email" defaultValue="admin@northstar-demo.dev" /></label>
          <label>Password<input className="input" name="password" type="password" defaultValue="Password123!" /></label>
          <button className="button" type="submit">Login</button>
        </form>
        <section className="card">
          <h2>Demo credentials</h2>
          <p><strong>admin@northstar-demo.dev</strong><br />Password123!</p>
          <p className="muted">Admin sessions use an httpOnly local cookie. API keys stay server-side and are shown only by prefix.</p>
        </section>
      </div>
    </main>
  );
}
