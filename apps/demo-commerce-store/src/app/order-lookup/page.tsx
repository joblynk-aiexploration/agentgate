export default function OrderLookupPage() {
  return (
    <main className="section">
      <div className="container grid two">
        <form className="card form" method="get">
          <h1>Order lookup</h1>
          <p className="muted">Create an order through checkout first, then use that order number and account email.</p>
          <input className="input" name="order" placeholder="Order number" />
          <input className="input" name="email" placeholder="Email" />
          <button className="button" type="submit">
            Lookup
          </button>
        </form>
        <section className="card">
          <h2>Need help?</h2>
          <p>
            Login as the demo customer, checkout, then open the Northstar Assistant and ask:
            “Where is my latest order?”
          </p>
        </section>
      </div>
    </main>
  );
}
