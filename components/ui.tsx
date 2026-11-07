import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "light" }) {
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold", variant === "primary" && "bg-forest text-white hover:bg-ink", variant === "outline" && "border border-forest/20 bg-white text-forest hover:border-forest", variant === "ghost" && "text-forest hover:bg-forest/10", variant === "light" && "bg-white/15 text-white backdrop-blur hover:bg-white/25", className)} {...props}>{children}</button>;
}
export function Badge({ children, className }: { children: ReactNode; className?: string }) { return <span className={cn("inline-flex items-center rounded-full bg-[#e1efdf] px-2.5 py-1 text-[11px] font-bold text-forest", className)}>{children}</span>; }
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("h-11 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm outline-none placeholder:text-ink/35 focus:border-leaf", className)} {...props} />; }
