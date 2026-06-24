import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable PWA caching in dev mode so it doesn't interfere
});

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '172.16.0.151',
    '172.16.0.151:3000',
    '10.80.0.2',
    '10.80.0.2:3000',
    '192.168.1.194',
    '192.168.1.194:3000',
  ],
};

export default withPWA(nextConfig);
