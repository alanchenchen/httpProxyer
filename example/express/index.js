const express = require('express')
const app = express()
const proxer = require('../../src/index').proxyMiddleware
const static = require('../../src/index').staticMiddleware

/**
 * 这个例子是展示基于插件编写的express中间件使用方法
 */

app.use(static({
    rootPath: '../../'
}))

app.use(proxer({
    target: 'http://localhost:4000',
    hooks: {
        proxyRequest(proxyReq, opt) {
            proxyReq.setHeader('whoami', 'AlanChen')
            // console.log(opt)
            console.log('请求被拦截啦')
        },
        proxyError(err, from) {
            console.log(err)
            console.log(from)
        }
    }
}))

app.listen(3000, () => {
    console.log('server is running at port 3000')
})