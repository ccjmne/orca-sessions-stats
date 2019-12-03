import path from 'path';

import { Configuration } from 'webpack';

import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const config: Configuration = {
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader'
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
        loader: MiniCssExtractPlugin.loader
      },
      {
        loader: 'css-loader',
        options: { minimize: true }
      },
      {
        loader: 'sass-loader',
        options: { outputStyle: 'compressed' }
      }
      ]
    }]
  },
  resolve: {
    modules: ['.', 'node_modules'],
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      hash: true,
      template: './src/index.html'
    })
  ]
};

export default config;
