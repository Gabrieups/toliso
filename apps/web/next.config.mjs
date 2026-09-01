/** @type {import('next').NextConfig} */
const nextConfig = {
  // O pacote compartilhado @toliso/core e distribuido como TypeScript
  // e precisa ser transpilado junto com a aplicacao.
  transpilePackages: ["@toliso/core"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Necessario para que o Next resolva arquivos fora de apps/web no monorepo.
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
}

export default nextConfig
