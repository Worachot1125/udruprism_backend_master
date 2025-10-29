/* eslint-disable @typescript-eslint/no-explicit-any */
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // domains ยังใช้ได้ แต่แนะนำใช้ remotePatterns ที่ยืดหยุ่นกว่า
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  outputFileTracingRoot: __dirname,

  webpack(config) {
    // ----- (กฎ SVG ของคุณคงเดิม) -----
    const excludeSvgFromAssetRules = (rules: any[]) => {
      for (const rule of rules) {
        if (!rule) continue;
        if (Array.isArray(rule.oneOf)) excludeSvgFromAssetRules(rule.oneOf);
        if (Array.isArray(rule.rules)) excludeSvgFromAssetRules(rule.rules);

        const isAssetType =
          rule?.type &&
          (rule.type === "asset" ||
            rule.type === "asset/resource" ||
            rule.type === "asset/inline" ||
            rule.type === "asset/source");

        if (isAssetType) {
          rule.exclude = Array.isArray(rule.exclude)
            ? [...rule.exclude, /\.svg$/i]
            : /\.svg$/i;
        }

        if (rule?.test instanceof RegExp && rule.test.test(".svg")) {
          rule.exclude = Array.isArray(rule.exclude)
            ? [...rule.exclude, /\.svg$/i]
            : /\.svg$/i;
        }
      }
    };

    excludeSvgFromAssetRules(config.module.rules as any[]);

    (config.module.rules as any[]).push({
      test: /\.svg$/i,
      oneOf: [
        { resourceQuery: /url/, type: "asset/resource" },
        {
          issuer: /\.[jt]sx?$/,
          use: [
            {
              loader: require.resolve("@svgr/webpack"),
              options: {
                icon: true,
                svgo: true,
                svgoConfig: {
                  plugins: ["preset-default", { name: "removeViewBox", active: false }],
                },
              },
            },
          ],
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
