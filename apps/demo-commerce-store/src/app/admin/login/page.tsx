export default function AdminLoginPage() {
  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <form className="card form" method="post" action="/api/admin/login">
          <h1>Northstar admin login</h1>
          <p className="muted">
            Demo credentials: admin@northstar-demo.dev / Password123!
          </p>
          <input className="input" name="email" type="email" placeholder="Email" defaultValue="admin@northstar-demo.dev" />
          <input className="input" name="password" type="password" placeholder="Password" defaultValue="Password123!" />
          <button className="button" type="submit">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}
