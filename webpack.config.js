'use strict'

const webpack = require('webpack')

let plugins = [
  new webpack.optimize.DedupePlugin()
]

if (process.env.NODE_ENV === 'production') {
  plugins = [
    new webpack.optimize.DedupePlugin(),
    new webpack.DefinePlugin({
      'process.env':{
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    })
  ]
}

module.exports = {
  entry: './src/main.jsx',
  output: {
    filename: 'main.js',
    path: './public'
  },
  devtool: 'sourcemap',
  plugins,
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['react', 'es2015']
        }
      }
    ]
  }
}
