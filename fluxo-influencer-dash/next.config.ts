import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! AVISO !!
    // Isso permite que o build de produção termine mesmo que
    // o projeto tenha erros de TypeScript.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Também ignora erros de linting no build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig