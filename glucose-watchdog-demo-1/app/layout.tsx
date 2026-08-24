import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glucose Watchdog",
  description: "Track glucose readings and insulin deliveries"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
