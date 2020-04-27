/*
 * @Author: hucheng
 * @Date: 2020-04-25 17:56:35
 * @Description: here is des
 */
// vue.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path')
module.exports = {
    outputDir: "./fe-view/dist",
    configureWebpack: {
        entry: './fe-view/src/main.js',
        plugins: [
            new HtmlWebpackPlugin({
              template: path.resolve(__dirname, './fe-view/public/index.html'),
            }),
          ],
    }
}