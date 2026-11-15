import type { MetadataRoute } from "next";

/** Rend Kettlebill installable sur téléphone et ordinateur (application web progressive). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kettlebill",
    short_name: "Kettlebill",
    description: "Budget, échéances, documents et impôts : ta vie administrative, enfin tranquille.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6f7",
    theme_color: "#0e6b6b",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
