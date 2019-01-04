const httpProxyer = require('./core/proxy')
const staticServer = require('./core/staticServer')
const proxyMiddleware = require('./expressMiddleWare/proxyMiddleware')
const staticMiddleware = require('./expressMiddleWare/staticMiddleware')

module.exports = {
    httpProxyer,
    staticServer,
    proxyMiddleware,
    staticMiddleware
}