const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    index: "./src/js2wy/js2wy.ts"
  },
  output: {
    globalObject: '(typeof self !== "undefined" ? self : this)', // make it works for both node and browser
    libraryTarget: "umd",
    library: 'wenyanizer',
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: [/\.ts$/, /\.js$/],
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  mode: 'production',
  externals: [nodeExternals()]
};
