import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],

  source: {
    entry: {
      content: "./src/content/index.ts",
    },
  },

  output: {
    filenameHash: false,
    filename: {
      js: "[name].js",
      css: "[name].css",
    },
    distPath: {
      root: "dist",
      js: "",
      css: "",
    },
    target: "web",
    copy: [{ from: "./public", to: "." }],
    sourceMap: {
      js: process.env.NODE_ENV === "development" ? "source-map" : false,
    },
  },

  html: {
    inject: false,
  },

  performance: {
    chunkSplit: {
      strategy: "custom",
      splitChunks: {
        chunks: "async",
        minSize: 1000,
        cacheGroups: {
          reactVendor: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: "vendor-react",
            chunks: "async",
            priority: 20,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor-lib",
            chunks: "async",
            priority: 10,
            reuseExistingChunk: true,
          },
          shared: {
            name: "shared",
            chunks: "async",
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    },
  },

  tools: {
    rspack: (config) => {
      if (!config.output) config.output = {};

      config.output.chunkFilename = "chunks/[name].js";

      // publicPath: 'auto' — calculated from import.meta.url at runtime.
      // Since content.js is loaded as ESM via bootstrap.js's
      // import(chrome.runtime.getURL('/content.js')), import.meta.url
      // returns chrome-extension://<id>/content.js and auto publicPath
      // resolves to chrome-extension://<id>/.
      config.output.publicPath = "auto";

      // Entry and chunks are ESM — loaded via import() which executes
      // in the content script's isolated world (not the page context).
      // <script> tags would execute in the PAGE context and break.
      config.output.module = true;
      config.output.chunkLoading = "import";
      config.output.chunkFormat = "module";

      if (!config.experiments) config.experiments = {};
      config.experiments.outputModule = true;

      return config;
    },
  },

  dev: {
    writeToDisk: true,
  },
});
