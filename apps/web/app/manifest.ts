import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Media Loader",
    short_name: "Media Loader",
    description: "Private, rights-aware media loading for personal use.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#090d11",
    theme_color: "#0c6b8a",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
