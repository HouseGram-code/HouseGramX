import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Превращает barrel-импорты иконок в точечные — меньше JS в бандле.
    optimizePackageImports: ["@phosphor-icons/react", "lucide-react"],
  },
};

export default nextConfig;
