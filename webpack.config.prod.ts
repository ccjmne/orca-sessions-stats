import path from 'path';

import { Configuration } from 'webpack';

import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

import webpackRxjsExternals from 'webpack-rxjs-externals';

const config: Configuration = {
  entry: './src/index.prod.ts',
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: { presets: ['@babel/preset-env'] }
      }
    }, {
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }, {
      test: /\.html$/,
      use: [{
        loader: 'html-loader',
        options: { minimize: true }
      }]
    }, {
      test: /\.scss$/,
      use: [{
        loader: 'style-loader'
      },
      {
        loader: 'css-loader'
      },
      {
        loader: 'sass-loader'
      }]
    }]
  },
  externals: ['angular'], // [webpackRxjsExternals(), 'angular'],
  resolve: {
    modules: ['.', 'node_modules'],
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    libraryTarget: 'umd',
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new CleanWebpackPlugin(),
    new BundleAnalyzerPlugin()
  ]
};

export default config;
