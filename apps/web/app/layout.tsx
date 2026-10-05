import type { ReactNode } from "react";
import AuthGate from "./auth-gate";

export const metadata = {
  title: "SpecialCare Hospital OS",
  description: "Hospital command center for 1,000+ bed operations"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AuthGate>{children}</AuthGate></body></html>;
}
