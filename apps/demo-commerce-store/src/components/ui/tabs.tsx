import Link from "next/link";

export function Tabs({ items }: { items: { href: string; label: string; active?: boolean }[] }) {
  return (
    <nav className="tabs">
      {items.map((item) => (
        <Link className={item.active ? "active" : ""} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
