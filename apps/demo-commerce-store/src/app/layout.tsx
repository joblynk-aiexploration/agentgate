import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat-widget";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northstar Outdoor Supply",
  description: "Local ecommerce demo store connected to AgentGate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
