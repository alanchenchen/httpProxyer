const http = require('http')
const HttpProxyPlugin = require('../../src/proxy')

const PortList = [
    1010,
    2020,
    3030,
    4040,
    5050,
    6060,
    7070,
    8080,
    9090,
    9191,
    9292,
    9393
]
const HOST_NAME = PortList.map(port => {
    return `http://localhost:${port}`
})

// 反向代理(挂在中间服务器里面做代理)
http.createServer((req, res) => {
    const nowHost = HOST_NAME.shift()
    HttpProxyPlugin.proxy(req, res, {
        target: nowHost
    })
    HOST_NAME.push(nowHost)
}).listen(3000, () => {
    console.log('反向代理服务器启动成功，监听3000端口...')
})

let n = 0
const generateHanlder = (port) => {
    return (req, res) => {
        ++n
        console.log(`接收${n}次请求...`)
        req.on('data', chunk => {
            console.log(`读取请求体： ${decodeURIComponent(chunk)}`)
        })
        // console.log(`请求方式： ${req.method}`)
        // console.log(`请求客户端本地ip：${req.socket.localAddress}`)
        // console.log(`请求客户端远程ip：${req.socket.remoteAddress}`)
        // console.log(`请求路径： ${req.url}`)
        // console.log(`请求头部： ${JSON.stringify(req.headers)}`)
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

PortList.forEach(port => {
    http.createServer(generateHanlder(port)).listen(port, () => {
        console.log(`server ${port} is running...`)
    })
})