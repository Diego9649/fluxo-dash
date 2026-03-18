/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Se você for usar imagens externas (como fotos de produtos da Yampi), adicione aqui:
  images: {
    domains: ['api.yampi.com.br'],
  },
};

export default nextConfig;