const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    index: "./src/js2wy.js"
  },
  output: {
    globalObject: '(typeof self !== "undefined" ? self : this)', // make it works for both node and browser
    libraryTarget: "umd2",
    library: 'wenyanizer',
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  mode: 'production',
  // removing this may make front-end work?
  // externals: [nodeExternals()]
};
