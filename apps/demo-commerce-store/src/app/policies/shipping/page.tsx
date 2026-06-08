export default function ShippingPolicyPage() {
  return (
    <main className="section">
      <div className="container card">
        <p className="eyebrow">Policy</p>
        <h1>Shipping policy</h1>
        <p>Northstar shows professional shipping and tracking states for local demo orders only. No carrier labels are purchased and no real fulfillment vendor is contacted.</p>
        <div className="grid three">
          <section><h2>Demo threshold</h2><p className="muted">Shipping is free over $75 in the storefront experience.</p></section>
          <section><h2>Tracking</h2><p className="muted">Tracking numbers and carrier names are placeholders generated from local order data.</p></section>
          <section><h2>Admin updates</h2><p className="muted">Admins can mark orders packed, shipped, and delivered for demo timeline purposes.</p></section>
        </div>
      </div>
    </main>
  );
}
