import type { NextConfig } from "next";
import path from "path";
import CopyWebpackPlugin from "copy-webpack-plugin";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(__dirname, "node_modules/cesium/Build/Cesium"),
            to: path.join(__dirname, "public/cesium"),
          },
        ],
      })
    );

    return config;
  },
};

export default nextConfig;