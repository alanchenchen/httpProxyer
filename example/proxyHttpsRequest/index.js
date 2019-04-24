const {proxy, createProxyServer} = require('../../src/core/proxy/index')

const URL = 'https://alancc.cn'
const ins = createProxyServer({
    target: URL,
    inherit: true
})
ins.on('proxyRequest', (req, info) => {
        console.log(info.path)
        // console.log(info)
        // req.setHeader('Referer', 'http://www.cnblogs.com/')
        // req.setHeader('Purpose', 'prefetch')
    })
    .on('proxyError', (error, from) => {
        console.log(error)
    })
    .listen(8080, '10.69.65.80', () => {
        console.log('server is running at http://10.69.65.80:8080')
    })

// console.log(ins)
// setTimeout(() => {
//     ins.close(() => {
//         console.log('proxy server has been closed')
//     })
// }, 2000)