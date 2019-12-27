const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    index: "./src/js2wy.js"
  },
  output: {
    globalObject: '(typeof self !== "undefined" ? self : this)', // make it works for both node and browser
    libraryTarget: "umd",
    library: 'wenyanizer',
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  mode: 'production',
  externals: [nodeExternals()]
};
