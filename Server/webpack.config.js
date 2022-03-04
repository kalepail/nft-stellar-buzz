const path = require('path')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'commonjs',
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.c?js$/, exclude: /node_modules/, loader: 'babel-loader'
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'src/shim.mjs', to: 'shim.mjs' }],
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      window: path.resolve(path.join(__dirname, 'src/@js/window')),
    })
  ]
}
