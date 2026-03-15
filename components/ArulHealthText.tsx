import Link from "next/link";

type ArulHealthTextProps = {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-lg font-semibold",
  md: "text-xl font-semibold",
  lg: "text-2xl font-semibold",
};

export function ArulHealthText({ className = "", href, size = "md" }: ArulHealthTextProps) {
  const content = (
    <span className={`tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-arul-forest">arul</span>
      <span className="text-arul-purple"> Health</span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block focus:outline-none focus:ring-2 focus:ring-arul-purple/50 rounded">
        {content}
      </Link>
    );
  }

  return content;
}
