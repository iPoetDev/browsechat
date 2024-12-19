//@ts-check

"use strict";

const path = require("path");
const fs = require("fs");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "node", // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/

  optimization: {
    moduleIds: 'deterministic'
  },
  plugins: [
    {
      apply(compiler) {
        compiler.hooks.compilation.tap('ASCIIEncodingPlugin', (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: 'ASCIIEncodingPlugin',
              stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_ENCODING
            },
            (assets) => {
              Object.keys(assets).forEach(filename => {
                const asset = assets[filename];
                const content = asset.source();
                const asciiContent = Buffer.from(content.toString(), 'utf8').toString('ascii');
                compilation.updateAsset(filename, new compiler.webpack.sources.RawSource(asciiContent));
              });
            }
          );
        });
      }
    }
  ],

  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 ->
    // https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    charset: false,
    environment: {
      // Disable features that might produce non-ASCII output
      templateLiteral: false,
    },
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
    modules: [path.resolve(__dirname, "src"), "node_modules"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, "src"),
        exclude: [
          path.resolve(__dirname, "tests"),
          path.resolve(__dirname, "behaviour"),
          path.resolve(__dirname, "node_modules")
        ],
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json",
              onlyCompileBundledFiles: true,
              transpileOnly: true,
              compilerOptions: {
                sourceMap: true,
                module: "commonjs"
              }
            }
          }
        ]
      }
    ]
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
    colors: false, // disable colored output
    appendOnly: true, // append to log file instead of overwriting
    stream: fs.createWriteStream("webpack.clean.log", {
      encoding: "ascii",
      flags: "a",
    }),
  },
  stats: {
    preset: "normal",
    colors: false,
    assets: true,
    modules: true,
    errors: true,
    errorDetails: true,
    errorStack: true,
  },
};
module.exports = [extensionConfig];
