const pkg = require('./package.json');
const path = require('path');
const webpack = require('webpack');

const production = process.env.NODE_ENV === 'production' || false;

module.exports = {
  entry: './src/dirty-form.js',
  mode: 'production',
  output: {
    filename: production ? 'dirty-form.min.js' : 'dirty-form.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'DirtyForm',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
    ]
  },
  optimization: {
    minimize: production
  }
};
