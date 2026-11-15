import type { CapacitorConfig } from "@capacitor/cli";

// L'app mobile affiche l'application web en ligne (même code, mêmes comptes, mises à jour instantanées).
// Change KETTLEBILL_URL pour pointer vers ton adresse Vercel avant de construire, ex. :
//   KETTLEBILL_URL=https://kettlebill.vercel.app npx cap sync
const url = process.env.KETTLEBILL_URL || "https://kettlebill.com";

const config: CapacitorConfig = {
  appId: "com.kettlebill.app",
  appName: "Kettlebill",
  webDir: "www",
  server: {
    url: `${url}/app`,
    cleartext: false,
    allowNavigation: [new URL(url).host, "checkout.stripe.com", "billing.stripe.com"],
  },
  ios: { contentInset: "automatic", backgroundColor: "#F3F6F7", appendUserAgent: "KettlebillApp-iOS" },
  android: { backgroundColor: "#F3F6F7", appendUserAgent: "KettlebillApp-Android" },
};

export default config;
