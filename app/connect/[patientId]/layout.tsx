import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Connect your accounts — Arul Health",
  description: "Connect your accounts so your care team can help you.",
};

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
