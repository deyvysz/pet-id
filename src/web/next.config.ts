import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker mínima (src/web/Dockerfile): server.js con solo las dependencias que usa.
  output: "standalone",
};

export default nextConfig;
