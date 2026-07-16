/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma's engine and the pg driver must stay real Node modules on the server:
  // bundling them breaks the adapter's native/dynamic requires at runtime.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
