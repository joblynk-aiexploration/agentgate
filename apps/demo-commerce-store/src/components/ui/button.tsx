import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
};

export function Button({ children, className = "", href, variant = "primary", ...props }: ButtonProps) {
  const classes = `button ${variant === "secondary" ? "secondary" : ""} ${variant === "danger" ? "danger" : ""} ${variant === "ghost" ? "ghost" : ""} ${className}`.trim();

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
