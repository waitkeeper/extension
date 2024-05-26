import path from "path"
import webpack, {
  Configuration,
  DefinePlugin,
  WebpackOptionsNormalized,
  WebpackPluginInstance,
} from "webpack"
import { merge as webpackMerge } from "webpack-merge"
import Dotenv from "dotenv-webpack"
import SizePlugin from "size-plugin"
import TerserPlugin from "terser-webpack-plugin"
import LiveReloadPlugin from "webpack-livereload-plugin"
import CopyPlugin, { ObjectPattern } from "copy-webpack-plugin"
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin"
import WebExtensionArchivePlugin from "./build-utils/web-extension-archive-webpack-plugin"
import InjectWindowProvider from "./build-utils/inject-window-provider"

// const supportedBrowsers = ["brave", "chrome", "edge", "firefox", "opera"]

const supportedBrowsers = ["chrome"]

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: "source-map",  // 指示webpack生成源代码映射文件 source map
  stats: "errors-only",  // 指示webpack在构建过程中只输出错误信息
  // 多个入口点，每个入口点都给webpack指定了将要生成单独javascript包的起始文件
  entry: {
    ui: "./src/ui.ts",
    "tab-ui": "./src/tab-ui.ts",
    background: "./src/background.ts",  // 后台脚本在后台运行，并处理不需要与用户节点交互的任务
    "background-ui": "./src/background-ui.ts",  // 包含后台脚本与UI组件通信的代码
    "window-provider": "./src/window-provider.ts", // 负责管理扩展程序中的浏览器窗口或者弹出窗口
    "provider-bridge": "./src/provider-bridge.ts",
    "twitter-content": "./src/twitter-content.js",
    "annotator-full.min": "./src/annotator-full.min.js"
  },
  // module 和 rules 配置用于定义 Webpack 如何处理和加载模块
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(tsx|ts|jsx)?$/, // 于匹配要应用此规则的文件类型的正则表达式
        exclude: /node_modules(?!\/@tallyho)|webpack/, //用于指定不应用此规则的文件类型的正则表达式
        use: [  // 于指定要应用于匹配文件的文件加载器数组。
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,  // 指示 Webpack 应缓存转换结果以提高性能。
            },
          },
        ],
      },
    ],
  },
  output: {
    // path: is set browser-specifically below
    filename: "[name].js",  // 使用入口点的名称作为文件名
  },
  // resolve 告诉webpack如何解析模块请求
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],  // 用于指定 Webpack 在尝试加载模块时需要考虑的扩展名列表。
    //  用于指定当 Webpack 无法在 node_modules 文件夹中找到某些 Node.js 核心模块时应该使用的替代方案。
    // 在浏览器环境中运行的代码可能无法直接使用 Node.js 的核心模块，因此需要使用 polyfill 来提供兼容性。
    fallback: {
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
      // these are required for @tallyho/keyring-controller
      crypto: require.resolve("crypto-browserify"),
    },
  },
  // 定义一系列用户扩展Webpack功能的插件。每个插件都提供特定的功能，帮你定制构建过程并优化输出文件
  plugins: [
    new InjectWindowProvider(),
    // 该插件用于加载 .env 文件中的环境变
    new Dotenv({
      defaults: true, // 加载默认的 .env 文件
      systemvars: true, // 将系统环境变量也作为环境变量暴露给您的代码
      safe: true, // 防止意外覆盖 .env 文件中的现有值。
    }),
    // 该插件用于在单独的进程中进行 TypeScript 类型检查，提高开发效率并提供更好的错误报告。
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
        mode: "write-references",
      },
    }),
    // polyfill the process and Buffer APIs
    // 该插件用于向您的代码中注入全局变量，避免显式地在每个模块中引入它们。例如，此处的配置将 Buffer 和 process 对象设置为全局变量。
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: ["process"],
    }),
    // 插件用于分析输出文件的体积，帮助您识别需要优化的代码部分
    new SizePlugin({}),
    // 该插件用于将静态资源从源目录复制到输出目录。此处的配置将来 自 node_modules/@tallyho/tally-ui/public/ 文件夹中的所有文件复制到输出目录。
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/@tallyho/tally-ui/public/",
        },
      ],
      // FIXME Forced cast below due to an incompatibility between the webpack
      // FIXME version refed in @types/copy-webpack-plugin and our local
      // FIXME webpack version.
    }) as unknown as WebpackPluginInstance,
    // 该插件用于在编译过程中定义全局常量。此处的配置将 process.env.VERSION 设置为当前包的版本号，可以通过 process.env.npm_package_version 获取。
    new DefinePlugin({
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
    }),
  ],
  // splitChunks 属性用于优化代码分割，这是一种旨在减小应用程序 JavaScript 包整体大小的技术
  // automaticNameDelimiter 属性用于指定自动拆分块生成块文件名时使用的分隔符
  optimization: {
    splitChunks: { automaticNameDelimiter: "-" },
  },
}

// Configuration adjustments for specific build modes, customized by browser.
const modeConfigs: {
  [mode: string]: (browser: string) => Partial<Configuration>
} = {
  development: () => ({
    plugins: [
      new LiveReloadPlugin({}),
      new CopyPlugin({
        patterns: ["dev-utils/*.js"],
        // FIXME Forced cast below due to an incompatibility between the webpack
        // FIXME version refed in @types/copy-webpack-plugin and our local
        // FIXME webpack version.
      }) as unknown as WebpackPluginInstance,
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            mangle: false,
            compress: false,
            output: {
              beautify: true,
              indent_level: 2, // eslint-disable-line camelcase
            },
          },
        }),
      ],
    },
  }),
  production: (browser) => ({
    // For some reason, every source map variant embeds absolute paths, and
    // Firefox reproducibility is required for Firefox add-on store submission.
    // As such, in production, no source maps for firefox for full
    // reproducibility.
    //
    // Ideally, we would figure out a way not to have absolute paths in source
    // maps.
    devtool: browser === "firefox" ? false : "source-map",
    plugins: [
      new WebExtensionArchivePlugin({
        filename: browser,
      }),
    ],
    optimization: {
      minimizer: [
        // Firefox imposes filesize limits in the add-on store, so Firefox
        // builds are mangled and compressed. In a perfect world, we would
        // never do this so that users can inspect the code running on their
        // system more easily.
        new TerserPlugin({
          terserOptions: {
            mangle: browser === "firefox",
            compress: browser === "firefox",
            output:
              browser === "firefox"
                ? undefined
                : {
                  beautify: true,
                  indent_level: 2, // eslint-disable-line camelcase
                },
          },
        }),
      ],
    },
  }),
}

// One config per supported browser, adjusted by mode.
export default (
  _: unknown,
  { mode }: WebpackOptionsNormalized
): webpack.Configuration[] =>
  supportedBrowsers.map((browser) => {
    const distPath = path.join(__dirname, "dist", browser)
    console.log("dispath ", distPath)

    console.log(`mode:${mode}`);


    // Try to find a build mode config adjustment and call it with the browser.
    const modeSpecificAdjuster =
      typeof mode !== "undefined" ? modeConfigs[mode] : undefined

    // console.log(`modeSpecificAdjuster: ${modeSpecificAdjuster}`);

    const modeSpecificAdjustment =
      typeof modeSpecificAdjuster !== "undefined"
        ? modeSpecificAdjuster(browser)
        : {}



    return webpackMerge(baseConfig, modeSpecificAdjustment, {
      name: browser,
      output: {
        path: distPath,
      },
      plugins: [
        // Handle manifest adjustments. Adjustments are looked up and merged:
        //  - by mode (`manifest.<mode>.json`)
        //  - by browser (`manifest.<browser>.json`)
        //  - by mode and browser both (`manifest.<mode>.<browser>.json`)
        //
        // Files that don't exist are ignored, while files with invalid data
        // throw an exception. The merge order means that e.g. a mode+browser
        // adjustment will override a browser adjustment, which will override a
        // mode adjustment in turn.
        //
        // Merging currently only supports adding keys, overriding existing key
        // values if their values are not arrays, or adding entries to arrays.
        // It does not support removing keys or array values. webpackMerge is
        // used for this.
        new CopyPlugin({
          patterns: [
            {
              from: `src/annotator.min.css`,
              to: `annotator.min.css`
            },
            {
              from: "src/jquery-3.7.1.min.js",
              to: "jquery-3.7.1.min.js"
            },
            {
              from: "src/jquery-1.7.2.js",
              to: "jquery-1.7.2.js"
            },
            {
              from: `manifest/manifest(|.${mode}|.${browser}|.${browser}.${mode}).json`,
              to: "manifest.json",
              transformAll: (assets: { data: Buffer }[]) => {
                console.log(`assets:${assets}`);
                assets.map((asset) => {
                  console.log(`asset:${asset.data.toString("utf8")}`);

                })

                const combinedManifest = webpackMerge(
                  {},
                  ...assets
                    .map((asset) => asset.data.toString("utf8"))
                    // JSON.parse chokes on empty strings
                    .filter((assetData) => assetData.trim().length > 0)
                    .map((assetData) => JSON.parse(assetData))
                )

                return JSON.stringify(combinedManifest, null, 2)
              },
            } as unknown as ObjectPattern, // ObjectPattern doesn't include transformAll in current types
          ],
          // FIXME Forced cast below due to an incompatibility between the webpack
          // FIXME version refed in @types/copy-webpack-plugin and our local
          // FIXME webpack version.
        }) as unknown as WebpackPluginInstance,
      ],
    })
  })
