import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arul Health — The navigator beside every patient",
  description:
    "Built to level the playing field between patients and the system around them. Care teams: connect patient tools and chat on their behalf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
