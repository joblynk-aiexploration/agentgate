import Link from "next/link";

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
          <h1>Create customer account</h1>
          <p className="muted">Local demo account only. No email verification is sent.</p>
          {params.error ? <p className="alert">Could not create that account. Try another email.</p> : null}
          <form className="form" method="post" action="/api/customer/register">
            <label>
              Name
              <input className="input" name="name" placeholder="Taylor Customer" required />
            </label>
            <label>
              Email
              <input className="input" name="email" type="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input className="input" name="password" type="password" minLength={8} required />
            </label>
            <button className="button" type="submit">
              Register
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Already seeded?</h2>
          <p className="muted">Use Sarah Miller’s demo account to follow the documented checkout and AgentGate approval flow.</p>
          <Link className="button secondary" href="/login">
            Go to login
          </Link>
        </section>
      </div>
    </main>
  );
}
