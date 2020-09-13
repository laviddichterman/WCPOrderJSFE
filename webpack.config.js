const path = require('path');

module.exports = [
  'source-map'
].map(devtool => ({
  //mode: 'development',
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.html$/i,
        loader: 'html-loader',
        options: {
          // Disables attributes processing
          attributes: false,
        },
      },
    ]
  },
  output: {
    path: path.resolve(__dirname, 'app'),
    filename: 'bundle.js',
  },
  devServer: {
    contentBase: path.join(__dirname, 'app'),
    compress: true,
    port: 9000
  },
  //devtool,
  // optimization: {
  //   runtimeChunk: true
  // },
  externals: {
    jQuery: 'jQuery',
    moment: 'moment',
    wcpshared: 'wcpshared',
  },
}));