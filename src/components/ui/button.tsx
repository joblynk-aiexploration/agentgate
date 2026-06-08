import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "border border-slate-900 bg-slate-950 text-white shadow-sm hover:bg-slate-800",
  secondary:
    "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "border border-red-700 bg-red-700 text-white shadow-sm hover:bg-red-800",
};

type BaseButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  variant?: ButtonVariant;
};

type ButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  className,
  href,
  variant = "primary",
  ...props
}: ButtonProps) {
  const buttonClassName = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    className,
  );

  if (href) {
    return (
      <Link className={buttonClassName} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClassName} type="button" {...props}>
      {children}
    </button>
  );
}
