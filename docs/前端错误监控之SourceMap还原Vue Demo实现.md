# 前端错误监控之SourceMap还原Vue Demo 实现
上篇写完后，有人留言说不知道在 Vue 中怎么实现这个功能，所以我写了这篇，会讲2种方式来实现

- 通过 Firefox 开源的 npm 包 `source-map` 实现在服务端获取映射关系
- 通过浏览器实现映射关系


首先是在 build 后把 sourcemap文件上传到 cdn 或者静态资源服务器上去
我这里写个简单的demo，在工业环境，应该是直接集成到持续集成脚本里去比较好

因为 Vue 全局捕获错误 `Vue.config.errorHandler = function(error, vm, info){}`,只要在这个方法处理就好了，问题出在这里面的 error 和 window.onerror 吐出来的格式是不一样的，直接通过 `source-map` 包处理是搞不成的，映射关系映射不上去，一堆问题，需要用 [TraceKit](https://github.com/occ/TraceKit)这个包来转换下就可以用了

大家知道 [sentry](https://www.sentry.com/)是一个开源的 错误收集系统，其中有个功能就是 source-map 映射，他们有个开源的 npm 包 [raven-js](https://www.npmjs.com/package/raven-js)，是收集浏览器错误的, 已经集成了 TraceKit，raven-js 在下篇收集用户行为，辅助判断错误，还会出现，我这里就直接用这个包，在实际生产中没有特别需求，或者时间要求比较紧，可以直接使用这个包来上报错误

```
import Raven from "raven-js";
import axios from 'axios'
const _ravenConfig = {
    release: "staging@2.0.0"
}
const  raven = Raven.config("http://localhost:3000/xxx", _ravenConfig)
raven.install();
raven.setTransport(function(option){
    let data = {
      stack:option.data,
      msg:(()=>{
        let res = []
        let data = option.data
        data.exception && data.exception.values && data.exception.values.length && res.push(`${data.exception.values[0].type}:${data.exception.values[0].value}`)
        return res.join(';')
      })(),
    }
    axios.post('http://localhost:3000/sourcemap/reportErrorMessage',data);
    option.onSuccess();
});
function formatComponentName(vm) {
  if (vm.$root === vm) {
    return 'root instance';
  }
  var name = vm._isVue ? vm.$options.name || vm.$options._componentTag : vm.name;
  return (
    (name ? 'component <' + name + '>' : 'anonymous component') +
    (vm._isVue && vm.$options.__file ? ' at ' + vm.$options.__file : '')
  );
}

Vue.config.productionTip = false;
const  _oldOnError = Vue.config.errorHandler;
Vue.config.errorHandler = function(error, vm, info) {
    const metaData = {};
    if (Object.prototype.toString.call(vm) === '[object Object]') {
      metaData.componentName = formatComponentName(vm);
      metaData.propsData = vm.$options.propsData;
    }

    if (typeof info !== 'undefined') {
      metaData.lifecycleHook = info;
    }

    Raven.captureException(error, {
      extra: metaData
    });

    if (typeof _oldOnError === 'function') {
      _oldOnError.call(this, error, vm, info);
    }
}
```
在 setTransport 方法里上报处理好的的异常，异常信息如下
```json
{
  "stack": {
    "project": "xxx",
    "logger": "javascript",
    "platform": "javascript",
    "request": {
      "headers": {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36"
      },
      "url": "http://localhost:8080/"
    },
    "exception": {
      "values": [
        {
          "type": "Error",
          "value": "手动触发异常",
          "stacktrace": {
            "frames": [
              {
                "filename": "http://localhost:8080/js/chunk-vendors.f3f154f7.js",
                "lineno": 7,
                "colno": 85724,
                "function": "HTMLButtonElement.o",
                "in_app": true
              },
              {
                "filename": "http://localhost:8080/js/chunk-vendors.f3f154f7.js",
                "lineno": 7,
                "colno": 51758,
                "function": "HTMLButtonElement.Qo.i._wrapper",
                "in_app": true
              },
              {
                "filename": "http://localhost:8080/js/chunk-vendors.f3f154f7.js",
                "lineno": 7,
                "colno": 13484,
                "function": "HTMLButtonElement.n",
                "in_app": true
              },
              {
                "filename": "http://localhost:8080/js/chunk-vendors.f3f154f7.js",
                "lineno": 7,
                "colno": 11664,
                "function": "ne",
                "in_app": true
              },
              {
                "filename": "http://localhost:8080/js/main.d41a5444.js",
                "lineno": 1,
                "colno": 2356,
                "function": "a.makeError",
                "in_app": true
              }
            ]
          }
        }
      ],
      "mechanism": {
        "type": "generic",
        "handled": true
      }
    },
    "transaction": "http://localhost:8080/js/main.d41a5444.js",
    "trimHeadFrames": 0,
    "extra": {
      "componentName": "component <app>",
      "lifecycleHook": "v-on handler",
      "session:duration": 99540
    },
    "breadcrumbs": {
      "values": [
        {
          "timestamp": 1587858857.627,
          "category": "ui.click",
          "message": "body > div#app > button"
        },
        {
          "timestamp": 1587858857.627,
          "message": "before make error",
          "level": "log",
          "category": "console"
        }
      ]
    },
    "release": "staging@2.0.0",
    "event_id": "6df36620747042ccb71161de4c82e207"
  },
  "msg": "Error:手动触发异常"
}
```
上面这个上报数据里面 `exception.values` 就包含了我们需要的信息，其他字段在下篇讲解

上报完成后，接下来就是服务端处理了 map文件，返回 map 对应的信息，服务端就主要用到 `source-map` 包，具体怎么处理也不是难事，对着 api 来就好，就不详细写，放到 demo 里，demo 在文末，最后效果如下,实现了一个最小闭环

最后效果如下

![image.png-731kB](http://static.zybuluo.com/hucheng91/odcrbq8rp2c1dgrkv48yb1aa/image.png)

## 通过浏览器映射

大家知道 我们构建好的js文件后面会跟一个 sourcemap的路径

![image.png-25kB](http://static.zybuluo.com/hucheng91/fysa340h58finmc1bwfv86x0/image.png)

通过 webpack 插件 [SourceMapDevToolPlugin](https://webpack.js.org/plugins/source-map-dev-tool-plugin/) 把这个map 替换成内网才能访问的域名就好了，上报还是按照上面那样上报，处理映射就交给浏览器处理，唯一不足的是 看具体错误的打开 浏览器 控制台，不是太直观


## demo 地址
https://github.com/hucheng91/fe-error-sourcemap
