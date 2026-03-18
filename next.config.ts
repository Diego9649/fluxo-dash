import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignora erros de ESLint no build (ajuda a subir mais rápido)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de tipagem no build
    ignoreBuildErrors: true,
  },
};

export default config;