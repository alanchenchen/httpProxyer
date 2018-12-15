const staticFile = require('../../src/staticServer')
const http = require('http')

/**
 * 这个例子是展示静态文件服务器插件，可以搭配httpProxyer插件实现前后端分离部署(不是node服务端渲染分离，也不是页面和接口放一起)
 * 1. 页面通过静态服务器打开
 * 2. 页面请求的是当前文件服务器，即代理服务器，不存在跨域
 * 3. 页面发出请求到代理服务器，转发到目标服务器(REST接口)，可以实现前后端开发分离和部署分离
 * 
 * 优势：
 *    1. 由于浏览器存在跨域问题，所以静态文件只能访问同一域的接口文件，导致目前前端界面和后台接口部署在一起，只能实现技术栈开发分离。
 *    2. 目前大多数项目部署分离，采用的是node服务器端渲染，但是这样开发不能算真正的技术栈开发分离。
 *    3. 理想状态 => 前端开发纯页面而不是node渲染，页面部署在一个服务器，后台接口部署在另一台服务器。httpProxyer和staticServer搭配即可是实现！
 */
http.createServer(async (req, res) => {
    const flag = await staticFile.start(req, res, {
        // rootPath: './example/emitEvents',
        homePage: 'main.js'
    })
    if(!flag) {
        const str = '没有找到静态文件，所以返回一条数据'
        const encode = decodeURIComponent(str)
        res.setHeader('Content-Type', 'text/plain;charset=utf8')
        res.end(encode)
    }
}).listen(7000, () => {
    console.log('server is running at 7000')
})