import Link from "next/link";
import { getRequestCartOwner } from "@/lib/customer-auth";
import { getCart, hydrateCart } from "@/lib/store";

export async function SiteHeader() {
  const { customer, owner } = await getRequestCartOwner();
  const cart = getCart(owner);
  const summary = hydrateCart(cart);

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link className="brand" href="/">
          Northstar Outdoor Supply
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/products">Products</Link>
          <Link href="/cart">Cart ({summary.count})</Link>
          <Link href="/help">Help</Link>
          <Link href="/policies/returns">Returns</Link>
          {customer ? <Link href="/account">Account</Link> : <Link href="/login">Login</Link>}
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
