import type { ReactNode } from "react";

export const metadata = {
  title: "SpecialCare Hospital OS",
  description: "Hospital command center for 1,000+ bed operations"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
