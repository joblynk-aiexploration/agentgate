import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <Badge tone="info">Customer portal</Badge>
          <h1>Sign in to Northstar</h1>
          <p className="muted">Create local demo orders, track fulfillment, view receipts, and ask the support assistant about real checkout history.</p>
          {params.error ? <Alert tone="danger">Login failed. Check the email and password.</Alert> : null}
          <form className="form" method="post" action="/api/customer/login">
            <input name="returnTo" type="hidden" value={params.returnTo ?? "/account"} />
            <label>Email<input className="input" name="email" type="email" defaultValue="customer@northstar-demo.dev" required /></label>
            <label>Password<input className="input" name="password" type="password" defaultValue="Password123!" required /></label>
            <button className="button" type="submit">Login</button>
          </form>
        </section>
        <section className="card">
          <h2>Demo credentials</h2>
          <p><strong>customer@northstar-demo.dev</strong><br />Password123!</p>
          <p className="muted">After reset, this account starts with no orders. Add products and checkout to create a realistic support flow.</p>
          <Link className="button secondary" href="/register">Create another demo account</Link>
        </section>
      </div>
    </main>
  );
}
