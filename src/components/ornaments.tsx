import { cn } from "@/lib/cn";

/**
 * Small graphic vocabulary taken from the seal: a hairline, a diamond and
 * concentric rings. Nothing here depicts a coat of arms, so nothing can be
 * heraldically wrong.
 */

/** Hairline – diamond – hairline. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 12"
      className={cn("h-3 w-[7.5rem] text-gold", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M0 6h50M70 6h50" />
      <path d="M60 1.5 64.5 6 60 10.5 55.5 6Z" />
    </svg>
  );
}

/** Concentric double ring used as a frame around quiet content. */
export function DoubleFrame({
  children,
  className,
  tone = "light",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const line = tone === "light" ? "border-gold/45" : "border-champagne/35";
  return (
    <div className={cn("relative border p-2.5 sm:p-3.5", line, className)}>
      <div className={cn("border", line)}>{children}</div>
    </div>
  );
}
