import type { MetadataRoute } from "next";

/** Web App Manifest для установки HouseGramX как PWA. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HouseGramX",
    short_name: "HouseGramX",
    description: "HouseGramX — современный мессенджер",
    start_url: "/chats",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#fa3a3a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
