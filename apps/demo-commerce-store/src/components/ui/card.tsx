import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="card-title">{children}</h2>;
}
