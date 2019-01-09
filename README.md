# httpProxyer

> 代理转发http请求的node包，无依赖，支持反向代理实现负载均衡，提供事件钩子函数拦截并重写数据

> Author : Alan Chen

> version: 0.0.7

> node >= 8.11.1

> Date: 2019/1/4

<div align="center">

[![](assets/logo.png)](https://www.npmjs.com/package/@alanchenchen/httpproxyer)

[![Build Status](https://travis-ci.org/alanchenchen/httpProxyer.svg?branch=master)](https://travis-ci.org/alanchenchen/httpProxyer)
![](https://img.shields.io/npm/v/@alanchenchen/httpproxyer.svg)
![](https://img.shields.io/node/v/@alanchenchen/httpproxyer.svg)
![](https://img.shields.io/npm/dt/@alanchenchen/httpproxyer.svg)
![](https://img.shields.io/github/license/alanchenchen/httpProxyer.svg)

</div>

## Usage 

1. `npm install --save @alanchenchen/httpproxyer` or `yarn add @alanchenchen/httpproxyer`
2. npm包内置两个原生node编写的插件，和两个实现了express中间件的插件。
3. npm包默认导出一个对象，包含4个key，分别是：
    * httpProxyer
    * staticServer
    * proxyMiddleware
    * staticMiddleware

## Options
### httpProxyer
#### httpProxyer对象方法
导出一个对象，自带2个方法，每个方法调用一次都会返回一个ProxyHttp实例。

1. createProxyServer 启用一个服务器事件监听器，必须调用listen方法才能开启服务器监听并代理转发。常用于正向代理。参数如下：
    * opts `[Object]`， 目前只支持一个target的key。值必须是代理服务器的http地址，例如：http://127.0.0.1:7070
2. proxy 代理转发已有服务器的请求,可以实现反向代理和负载均衡。参数如下：
    * IncomingMessage `[可读流]`，Http Server类request事件的第一个参数req
    * ServerResponse `[可写流]`，Http Server类request事件的第二个参数res
    * opts `[Object]`， 目前只支持一个target的key。值必须是代理服务器的http地址，例如：http://127.0.0.1:7070 

#### ProxyHttp实例 
1. ProxyHttp实例支持事件监听，通过`on(event, callback)`来调用，第一个参数是事件名，第二个参数是回调函数。目前支持3个事件钩子：
    * `proxyRequest` 在转发请求之前触发，函数有2个参数
        * proxyReq `[可写流]`，代理服务器请求目标服务器的数据，当调用`proxyReq.write()`方法或`proxyReq.end()`方法或`pipe(proxyReq)`会重写请求数据。否则默认转发客户端请求
        * opts `[Object]`，包含请求头和请求url之类的信息对象，只读
    * `proxyResponse` 在转发请求，目标服务器数据响应成功，返回响应数据到客户端之前触发，函数有3个参数
        * proxyRes `[可写流]`，代理服务器返回给源请求的数据，当调用`proxyRes.write()`方法或`proxyRes.end()`方法或`pipe(proxyRes)`会重写返回数据。否则默认返回目标服务器响应数据
        * res `[可读流]`，目标服务器返回给代理服务器的数据
        * opts  `[Object]`，包含响应头和http状态码的信息对象，只读
    * `proxyError` 在代理服务器接收客户端请求或转发请求发生错误时触发，函数有2个参数
        * error `[Error]` 错误对象
        * from `[String]` server或client中其一种字符串。server表示错误发生在代理服务请求出错。client表示代理服务器接收客户端请求出错。  
2. ProxyHttp实例还自带一个`close`方法，使用方法和node的http模块类似。可选一个回调函数，当关闭服务器后触发。

### staticServer 
导出一个类，自带1个静态方法`start`。返回一个promise，promise只会存在then，then返回一个布尔值，用来判断当前路径是否存在静态文件。true，会返回文件，false，表示当前路径不存在静态文件。参数如下：
* IncomingMessage `[可读流]`，Http Server类request事件的第一个参数req
* ServerResponse `[可写流]`，Http Server类request事件的第二个参数res
* opts `[Object]`， 目前支持两个key。
    * rootPath `[String]` 指定文件目录作为服务器根目录，默认为'/'，即进程运行的的目录
    * homePage `[String]` 当req的url为'/'时跳转的首页文件，默认为'index.html'

> 基于两个插件实现的express中间件`proxyMiddleware`和`staticMiddleware`用法同上面类似，可以去[example/express](./example/express/server.js)看详细例子。 

## Unit tests
* test目录里目前只有一个测试用例，分别测试了`httpProxyer`的`createProxyServer()`、`proxy()`和`on()`方法。
* 测试框架为mocha，如果需要增加测试用例，操作如下：
    1. `git clone git@github.com:alanchenchen/httpProxyer.git`
    2. 在test目录里新增测试文件，约定测试文件必须是`*.test.js`后缀格式，必须在js后缀前加test后缀。
    3. `yarn`或`npm install`安装开发依赖mocha
    4. `npm test`在终端terminal查看测试结果

## license
* MIT
