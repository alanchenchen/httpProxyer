const http = require('http')
const HttpProxyPlugin = require('../../src/proxy')

/**
 * 这个例子是展示HttpProxyPlugin插件提供的事件钩子函数
 */

const PORT = 7070
const HOST_NAME =  `http://localhost:${PORT}`

// 挂在已有服务器里面做代理
http.createServer((req, res) => {
    const ins = HttpProxyPlugin.proxy(req, res, {
        target: HOST_NAME
    })
    ins.on('proxyResponse', (proxyRes, res, opt) => {
        // console.log(opt)
        const modifyiedData = {
            hi: 'alan',
            from: 'proxy'
        }
        proxyRes.setHeader('hey', 'boy')
    })
    console.log(ins)
})
.listen(3000, () => {
    console.log('反向代理服务器启动成功，监听3000端口...')
})

// 自启内置服务器做代理
// const ins = HttpProxyPlugin.createProxyServer({
//     target: 'http://localhost:7070'
// }).listen(3000, '192.168.0.43')

// ins.on('proxyRequest', (proxyReq, opt) => {
//     // console.log(ins)
//     console.log(opt)
// })

const generateHanlder = (port) => {
    return (req, res) => {
        req.on('data', chunk => {
            console.log(`读取请求体： ${decodeURIComponent(chunk)}`)
        })
        console.log(`请求方式： ${req.method}`)
        // console.log(`请求客户端本地ip：${req.socket.localAddress}`)
        // console.log(`请求客户端远程ip：${req.socket.remoteAddress}`)
        console.log(`请求路径： ${req.url}`)
        console.log(`请求头部： ${JSON.stringify(req.headers)}`)
        // console.log('\n')

        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf8',
            'name': 'proxyPlugin',
            'author': 'AlanChen'
        })
        const msg = {
            code: '0001',
            info: `反向代理http插件测试成功！当前服务器是${port}端口`
        }
        res.write(JSON.stringify(msg))
        res.end()
    }
}

http.createServer(generateHanlder(PORT)).listen(PORT, () => {
    console.log(`目标服务器启动成功，监听${PORT}...`)
})