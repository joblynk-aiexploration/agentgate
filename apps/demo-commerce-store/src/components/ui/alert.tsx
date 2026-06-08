import type { ReactNode } from "react";

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "danger" | "success" }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}
