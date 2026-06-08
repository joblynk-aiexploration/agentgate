import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link className="brand" href="/">
          Northstar Outdoor Supply
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/products">Products</Link>
          <Link href="/order-lookup">Order lookup</Link>
          <Link href="/help">Help</Link>
          <Link href="/policies/returns">Returns</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
