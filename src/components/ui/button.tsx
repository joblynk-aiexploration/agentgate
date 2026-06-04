import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#172326] text-white hover:bg-[#22363b]",
  secondary:
    "border border-[#cbd3df] bg-white text-[#172326] hover:bg-[#f5f7fb]",
  ghost: "text-[#34404a] hover:bg-[#edf1f6]",
  danger: "bg-[#9d3f1f] text-white hover:bg-[#7f3218]",
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
    "inline-flex h-10 items-center justify-center gap-2 px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
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
