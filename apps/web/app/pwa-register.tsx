"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The app remains fully usable if service-worker registration is unavailable.
      });
    }
  }, []);
  return null;
}
