/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["libsql", "@libsql/client"],
  },
}; 
module.exports = nextConfig;
