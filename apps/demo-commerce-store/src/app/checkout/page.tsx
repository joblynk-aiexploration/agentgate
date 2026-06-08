export default function CheckoutPage() {
  return (
    <main className="section">
      <div className="container">
        <form className="card form" method="post" action="/api/checkout">
          <h1>Demo checkout</h1>
          <p className="muted">Creates a local demo order. No card, tax, shipping, or payment provider is used.</p>
          <input className="input" name="name" placeholder="Name" defaultValue="Demo Customer" />
          <input className="input" name="email" placeholder="Email" defaultValue="demo@example.com" />
          <button className="button" type="submit">
            Create demo order
          </button>
        </form>
      </div>
    </main>
  );
}
