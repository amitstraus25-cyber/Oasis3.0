import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NHI Fixer | Oasis Security",
  description: "Fix Non-Human Identity security issues in this retro pixel art game. Identity security for the Agentic era.",
  keywords: ["NHI", "Non-Human Identity", "security", "game", "Oasis Security"],
  authors: [{ name: "Oasis Security" }],
  openGraph: {
    title: "NHI Fixer | Oasis Security",
    description: "Fix Non-Human Identity security issues in this retro pixel art game.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
