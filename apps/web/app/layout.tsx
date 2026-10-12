import type { ReactNode } from "react";
import AuthGate from "./auth-gate";
import PwaRegister from "./pwa-register";

export const metadata = {
  title: "SpecialCare Hospital OS",
  description: "Hospital command center for 1,000+ bed operations",
  applicationName: "SpecialCare Hospital OS",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "SpecialCare" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export const viewport = {
  themeColor: "#12314b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><PwaRegister /><AuthGate>{children}</AuthGate></body></html>;
}
