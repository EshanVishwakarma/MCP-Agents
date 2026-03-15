import Image from "next/image";
import Link from "next/link";

type ArulLogoProps = {
  className?: string;
  href?: string;
  height?: number;
  priority?: boolean;
};

export function ArulLogo({ className = "", href, height = 32, priority }: ArulLogoProps) {
  const img = (
    <Image
      src="/arul-health-logo.png"
      alt="Arul Health"
      width={height * 4.5}
      height={height}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ height }}
      priority={priority}
      unoptimized
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-block focus:outline-none focus:ring-2 focus:ring-arul-purple/50 rounded">
        {img}
      </Link>
    );
  }

  return img;
}
