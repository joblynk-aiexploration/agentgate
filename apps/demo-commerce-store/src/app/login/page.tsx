import Link from "next/link";

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
          <h1>Customer login</h1>
          <p className="muted">Sign in to create local demo orders and let the assistant help with your actual checkout history.</p>
          {params.error ? <p className="alert">Login failed. Check the email and password.</p> : null}
          <form className="form" method="post" action="/api/customer/login">
            <input name="returnTo" type="hidden" value={params.returnTo ?? "/account"} />
            <label>
              Email
              <input className="input" name="email" type="email" defaultValue="customer@northstar-demo.dev" required />
            </label>
            <label>
              Password
              <input className="input" name="password" type="password" defaultValue="Password123!" required />
            </label>
            <button className="button" type="submit">
              Login
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Demo credentials</h2>
          <p>
            <strong>Customer:</strong> customer@northstar-demo.dev
            <br />
            <strong>Password:</strong> Password123!
          </p>
          <p className="muted">This account starts with no orders after reset. Add products and checkout to create one.</p>
          <Link className="button secondary" href="/register">
            Create another demo account
          </Link>
        </section>
      </div>
    </main>
  );
}
