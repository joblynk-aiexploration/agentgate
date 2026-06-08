import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="section">
      <div className="container grid two">
        <section className="card">
          <Badge>Local account</Badge>
          <h1>Create customer account</h1>
          <p className="muted">Local demo account only. No email verification is sent.</p>
          {params.error ? <Alert tone="danger">Could not create that account. Try another email.</Alert> : null}
          <form className="form" method="post" action="/api/customer/register">
            <label>Name<input className="input" name="name" placeholder="Taylor Customer" required /></label>
            <label>Email<input className="input" name="email" type="email" placeholder="you@example.com" required /></label>
            <label>Password<input className="input" name="password" type="password" minLength={8} required /></label>
            <button className="button" type="submit">Register</button>
          </form>
        </section>
        <section className="card">
          <h2>Use the seeded flow</h2>
          <p className="muted">Sarah Miller’s demo account is best for the documented checkout, tracking, and AgentGate approval flow.</p>
          <Link className="button secondary" href="/login">Go to login</Link>
        </section>
      </div>
    </main>
  );
}
