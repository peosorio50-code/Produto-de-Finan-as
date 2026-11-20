import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Site estático: a pasta out/ vai inteira para o Cloudflare Pages (folegofinanceiro.shop).
  // A parte de servidor roda no servidor do Meu Santo Protetor (api.mapadaalma.online/api/folego).
  output: "export",
  images: { unoptimized: true },
};

export default config;
