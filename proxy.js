const http = require('http')
const { createReadStream, readFile, readdir, access } = require('fs')
const { parse } = require('url')

const NeedRequestBodyMethods = ['PUT', 'POST', 'PATCH']

class ProxyHttp {
    constructor() {
        this.version = '0.0.2'
        this.createdBy = 'alanchenchen@github.com'
        this.proxyEvents = {}
    }

    /**
     * @description 转发请求并写入响应数据到指定可写流
     * @param {Object} options request请求的配置参数，包含请求头
     * @param {String | Buffer} body 请求内容 
     * @param {WriteStream} writeStream 需要写入返回数据的可写流
     */
    _clientRequest(options, body, writeStream) {
        const ClientRequest = http.request(options, res => {
            // proxy server发出请求到target server，返回响应头，httpCode以及响应体给proxy server接收的请求
            const responseHeaders = res.headers
            const responseStatusCode = res.statusCode
            
            // 插件的proxyResponse事件在发出请求，返回的数据读取完之后触发
            let resBody
            res.on('data', chunk => {
                resBody = decodeURIComponent((chunk).toString())
            })
            res.on('end', () => {
                const proxyResponseData = {
                    stream: res,
                    headers: responseHeaders,
                    statusCode: responseStatusCode,
                    body: resBody
                }
                this.proxyEvents['proxyResponse']
                && this.proxyEvents['proxyResponse'](proxyResponseData)
            })
            res.on('error', () => {
                // 插件的proxyError事件在发出请求，返回的数据读取发生错误触发
                this.proxyEvents['proxyError']
                && this.proxyEvents['proxyError']()
            })

            writeStream.writeHead(responseStatusCode, responseHeaders)
            res.pipe(writeStream)
        })
    
        // 如果请求是POST、PUT或PATCH，则proxy server发出请求带上请求体信息
        if(NeedRequestBodyMethods.includes(options.method)) {
            if(typeof body == 'string' || Buffer.isBuffer(body)) {
                ClientRequest.write(body)
            }
        }
    
        ClientRequest.end()

        // 处理从target server返回的错误
        ClientRequest.on('error', () => {
            // 插件的proxyError事件在发出请求，发生错误触发
            this.proxyEvents['proxyError']
            && this.proxyEvents['proxyError']()
            throw new Error('some errors occured from http server')
        })
    }

    createListener(target, staticServer=false) {
        try {
            parse(target, true)
        } 
        catch (error) {
            throw new Error('target server must be an URL string')
        }

        this.targetServer = target
        this.staticServer = staticServer

        this.proxyServerListener = (req, res) => {
            const { slashes, pathname, href, hash, search, query, ...TARGET_SERVER_OPTIONS } = parse(this.targetServer, true)
            const { method, url, headers } = req
            const { path } = parse(url, true)

            // 通过proxy server的接收请求可读流，读取出请求体信息
            let reqBody
            req.on('data', chunk => {
                reqBody = decodeURIComponent(chunk)
            })

            // 必须保证proxy server的接收请求数据读取完毕后才能发出请求，否则reqBody为空
            req.on('end', () => {
                // 插件的proxyRequest事件在接收请求，请求的数据读取完之后触发
                const proxyRequestData = {
                    method: req.method,
                    url: req.url,
                    stream: req,
                    headers: req.headers,
                    body: reqBody
                }
                this.proxyEvents['proxyRequest']
                && this.proxyEvents['proxyRequest'](proxyRequestData)

                // 读取proxy server的接收请求的url、method和headers信息，和target server信息合并当作proxy server的发出请求的配置信息
                const options = {
                    ...TARGET_SERVER_OPTIONS,
                    method,
                    path,
                    headers
                }
                
                // proxy server转发请求到target server并返回数据到接收请求的可写流
                this._clientRequest(options, reqBody, res)
            })

            req.on('error', () => {
                // 插件的proxyError事件在接收请求，发生错误触发
                this.proxyEvents['proxyError']
                && this.proxyEvents['proxyError']()
            })
        }

        return this
    }

    listen(port=80, host='localhost', cb) {
        http.createServer(this.proxyServerListener).listen(port, host, () => {
            console.log(`proxy server http://${host}:${port} to ${this.targetServer} is running...`)
            cb && cb()
        })

        return this
    }

    on(event, handler) {
        switch (event) {
            case 'proxyRequest': 
                this.proxyEvents['proxyRequest'] = handler
                break
            case 'proxyResponse':
                this.proxyEvents['proxyResponse'] = handler
                break
            case 'proxyError':
                this.proxyEvents['proxyError'] = handler
                break
        }

        return this
    }
}

class StaticFileServer {
    constructor() {

    }

}

/**
 * @description 模块默认导出的对象
 * @method createProxyHttpServer 启用一个服务器事件监听器，必须调用listen方法才能开启服务器监听并代理转发
 * @method proxy 代理转发已有服务器的请求
 */
const HttpProxyPlugin = { 
    /**
     * @description 正向代理
     * @param {URL} target 必须是代理服务器的http地址，例如：http://127.0.0.1:7070
     * @param {*} static 若为Boolean，则表示是否开启静态文件服务器，若为Object，则可以定制静态文件服务器
     * @returns {ProxyHttp Instance} 可以链式调用，必须调用listen方法，才会启用服务器监听
     */
    createProxyHttpServer({target, static}){
        return new ProxyHttp().createListener(target, static)
    },
    /**
     * @description 反向代理
     * @param {ReadStream} readStream 可读流，一般是Http Server类request事件的第一个参数req
     * @param {WriteSteam} writeSteam 可写流，一般是Http Server类request事件的第二个参数res
     * @param {URL} target 必须是代理服务器的http地址，例如：http://127.0.0.1:7070
     */
    proxy(readStream, writeSteam, {target}) {
        return new ProxyHttp()
                    .createListener(target)
                    .proxyServerListener(readStream, writeSteam)
    } 
}

module.exports = HttpProxyPlugin