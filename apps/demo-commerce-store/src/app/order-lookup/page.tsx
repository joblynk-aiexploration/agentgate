export default function OrderLookupPage() {
  return (
    <main className="section">
      <div className="container grid two">
        <form className="card form" method="get">
          <h1>Order lookup</h1>
          <p className="muted">Use NS-1001 / sarah@example.com to test the seeded demo flow.</p>
          <input className="input" name="order" placeholder="Order number" />
          <input className="input" name="email" placeholder="Email" />
          <button className="button" type="submit">
            Lookup
          </button>
        </form>
        <section className="card">
          <h2>Need help?</h2>
          <p>
            Open the Northstar Assistant and ask: “Where is my order NS-1001?
            sarah@example.com”
          </p>
        </section>
      </div>
    </main>
  );
}
