const webpack = require('webpack')
const slsw = require('serverless-webpack')
const TerserPlugin = require('terser-webpack-plugin')
const nodeExternals = require('webpack-node-externals')

const isLocal = slsw.lib.webpack.isLocal

module.exports = {
  mode: isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  devtool: isLocal ? 'source-map' : false,
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  externalsPresets: { 
    node: true 
  },
  externals: [
    nodeExternals(),
    /aws-sdk/,
    /sodium-native/
  ],
  module: {
    rules: [{
      test: /\.c?js$/, exclude: /node_modules/, loader: 'babel-loader'
    }]
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
  ]
}