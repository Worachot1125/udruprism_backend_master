// next.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    // alias @ -> src (ถ้ายังไม่ได้ใส่)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
      "@/icons": path.resolve(__dirname, "src/icons"),
    };

    // ลบการจับ .svg เดิมออก (กันชนกัน)
    config.module.rules = config.module.rules.map((rule) => {
      if (typeof rule === "object" && rule?.test instanceof RegExp && rule.test.test(".svg")) {
        return {
          ...rule,
          test: new RegExp(rule.test.source.replace("|svg", "").replace("svg|", "")),
        };
      }
      return rule;
    });

    // กฎใหม่สำหรับ .svg
    config.module.rules.push({
      test: /\.svg$/i,
      oneOf: [
        {
          // ใช้ SVGR เฉพาะไฟล์ใน src/icons
          issuer: /\.[jt]sx?$/,
          include: path.resolve(__dirname, "src/icons"),
          use: [
            {
              loader: "@svgr/webpack",
              options: {
                icon: true,
                svgo: true,
                svgoConfig: {
                  plugins: [
                    // ใช้ preset-default แล้ว override ไม่ให้ลบ viewBox
                    {
                      name: "preset-default",
                      params: {
                        overrides: {
                          removeViewBox: false,
                        },
                      },
                    },
                    // ถ้าต้องการกันชน ID ชนกัน ให้เปิด prefixIds (ไม่ใช่ cleanupIDs แล้ว)
                    // "prefixIds",
                  ],
                },
              },
            },
          ],
        },
        {
          // นอก src/icons ให้เป็น asset ปกติ
          type: "asset",
          parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
          generator: { filename: "static/media/[name].[contenthash][ext]" },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
