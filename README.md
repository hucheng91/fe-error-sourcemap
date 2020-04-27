<!--
 * @Author: hucheng
 * @Date: 2020-04-28 00:15:39
 * @Description: here is des
 -->
# vue source-map demo

[生产环境通过SourceMap还原压缩后JavaScript错误，快速定位异常](https://zhuanlan.zhihu.com/p/64033141)
[前端错误监控之SourceMap还原Vue Demo 实现](https://zhuanlan.zhihu.com/p/136840107)
[前端错误监控之用户行为回放](https://zhuanlan.zhihu.com/p/136840753)

实际效果

![效果](./sourcemap.png)


# dev

- npm i
- npm run build
- cd fe-view/dist  && http-server -p 8080 or live-server -p 8080 ( or other static server,if use http-server, you need npm i http-server -g or npm i -g live-server)
- npm run dev 
- open http://localhost:8080/,
- open http://localhost:3000/sourcemap.html 