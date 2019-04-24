const http = require('http')
const https = require('https')
const { parse } = require('url')
const version = require('../../../package.json').version
const { queryFunctionParams } = require('../../utils')

const NeedRequestBodyMethods = ['PUT', 'POST', 'PATCH']

class ProxyHttp {
    constructor() {
        this.version = version
        this.createdBy = 'alanchenchen@github.com'
        this.proxyEvents = {}
    }

    /**
     * 转发请求并写入响应数据到指定可写流
     * 
     * @param {Object} options request请求的配置参数，包含请求头
     * @param {String | Buffer} reqBody 请求内容 
     * @param {WriteStream} writeStream 需要写入返回数据的可写流
     */
    _clientRequest(options, reqBody, writeStream) {
        /**
         * 针对https请求做一些必要处理，port必须为443。
         * 实测发现https的ClinetRequest实例调用setHeaders没有生效，所以在options里预先更改headers.host，主要用来避免服务器反爬虫导致报错。
         * 实测https的ClinetRequest实例不手动调用end方法也可以发出请求。
         */
        const { protocol } = options
        let FinalRequestModule = http
        let FinalRequestOpts = options
        if (protocol == 'https:') {
            FinalRequestModule = https
            FinalRequestOpts.port = 443
            FinalRequestOpts.headers.host = ''
        }

        const ClientRequest = FinalRequestModule.request(FinalRequestOpts, res => {
            /**
             * proxy server转发请求到target server，返回响应头，httpCode以及响应体
             */
            const proxyResponseData = {
                headers: res.headers,
                statusCode: res.statusCode
            }

            writeStream.statusCode = proxyResponseData.statusCode
            Object.entries(proxyResponseData.headers).forEach(item => {
                writeStream.setHeader(item[0], item[1])
            })
            /**
             * 插件的proxyResponse事件在转发请求，目标服务器数据响应成功，返回响应数据到客户端之前触发
             * 1. 当没有事件监听时，默认返回目标服务器的数据
             * 2. 当有事件监听时，通过函数字符串解析匹配正则来判断，回调函数里是否调用了write、end或pipe方法
             * 3. 一旦调用上述方法，则重写目标服务器数据，否则默认返回目标服务器数据
             * 
             * 如果想重写返回数据，必须调用writeStream的write()或end()方法或pipe给writeStream
             * writeStream => 代理服务器返回给源请求的数据，可写流
             * res => 目标服务器返回给代理服务器的数据，可读流
             * proxyResponseData => 包含响应头和http状态码的信息对象，只读
             */
            const resFnStr = this.proxyEvents['proxyResponse']
                && this.proxyEvents['proxyResponse'].toString()
            const proxyResStr = resFnStr
                && queryFunctionParams(resFnStr)[0]
            const resRegExpRule = new RegExp(`(${proxyResStr}\.(write|end)|pipe\.${proxyResStr})`)
            const shouldResponseSourceChunks = !this.proxyEvents['proxyResponse'] || !resRegExpRule.test(resFnStr)

            if (this.proxyEvents['proxyResponse']) {
                this.proxyEvents['proxyResponse'](writeStream, res, proxyResponseData)
            }
            if (shouldResponseSourceChunks) {
                res.pipe(writeStream)
            }
        })

        /**
         * 插件的proxyRequest事件在转发请求之前触发
         * 1. 当没有事件监听时，默认转发请求数据
         * 2. 当有事件监听时，通过函数字符串解析匹配正则来判断，回调函数里是否调用了write、end或pipe方法
         * 3. 一旦调用上述方法，则重写转发请求数据，否则默认转发请求数据 
         * 
         * 如果想重写请求数据，必须调用ClientRequest的write()方法或end()方法或pipe给ClientRequest
         * ClientRequest => 代理服务器请求目标服务器的数据，可写流
         * proxyRequestData => 包含请求头和请求url之类的信息对象，只读
         */
        const reqFnStr = this.proxyEvents['proxyRequest']
            && this.proxyEvents['proxyRequest'].toString()
        const proxyReqStr = reqFnStr
            && queryFunctionParams(reqFnStr)[0]
        const reqRegExpRule = new RegExp(`(${proxyReqStr}\.(write|end)|pipe\.${proxyReqStr})`)
        const shouldRequestSourceChunks = !this.proxyEvents['proxyRequest'] || !reqRegExpRule.test(reqFnStr)

        if (this.proxyEvents['proxyRequest']) {
            const proxyRequestData = FinalRequestOpts
            this.proxyEvents['proxyRequest'](ClientRequest, proxyRequestData)
        }
        if (shouldRequestSourceChunks) {
            // 仅当请求是POST、PUT或PATCH，proxy server发出请求带上请求体信息
            if (NeedRequestBodyMethods.includes(FinalRequestOpts.method)) {
                reqBody.forEach(body => {
                    if (typeof body == 'string' || Buffer.isBuffer(body)) {
                        ClientRequest.write(body)
                    }
                })
            }
            ClientRequest.end()
        }

        // 处理从target server返回的错误
        ClientRequest.on('error', e => {
            /**
             * 插件的proxyError事件在转发请求发生错误时触发
             */
            this.proxyEvents['proxyError']
                && this.proxyEvents['proxyError'](e, 'server')
            throw new Error('some errors occured from http server')
        })
    }

    /**
     * 接收请求,拼接代理服务器信息和本地服务器信息，生成一个httpServerListenHandler
     * 
     * @param {URL} target 代理远程服务器的URL，可以包含完整的path路径，可选query和hash信息
     * @param {Boolean} inherit 转发请求是否继承当前target的query和hash信息，默认false，false表示本地代理服务器的path和请求远程服务器的path永远保持一致 
     * @returns {ProxyHttp}
     */
    createListener({ target, inherit = false }) {
        try {
            parse(target, true)
        }
        catch (error) {
            throw new Error('target server must be an URL string')
        }

        this.proxyConfigs = {
            target,
            inherit
        }

        this.proxyServerListener = (req, res) => {
            const { protocol, port, path: targetPath, hostname, auth } = parse(target, true)
            const { method, url, headers } = req
            let path = parse(url, true).path
            if (inherit === true) {
                if (targetPath != '/') {
                    path = path == '/' ? targetPath : targetPath + path
                }
            }

            // 通过proxy server的接收请求可读流，读取出请求体信息
            /**
             * 为了避免请求体是buffer的情况，所以不能用字符串拼接
             */
            let reqBody = []
            req.on('data', chunk => {
                reqBody.push(chunk)
            })

            // 必须保证proxy server的接收请求数据读取完毕后才能发出请求，否则reqBody为空
            req.on('end', () => {
                // 读取proxy server的接收请求的url、method和headers信息，和target server信息合并当作proxy server的发出请求的配置信息
                const options = {
                    protocol,
                    hostname,
                    port,
                    path,
                    method,
                    headers,
                    auth
                }

                // proxy server转发请求到target server并返回数据到接收请求的可写流
                this._clientRequest(options, reqBody, res)
            })

            req.on('error', (e) => {
                // 插件的proxyError事件在接收请求，发生错误触发
                this.proxyEvents['proxyError']
                    && this.proxyEvents['proxyError'](e, 'client')
            })

            return this
        }

        return this
    }

    /**
     * 监听端口，开启服务器
     * 
     * @param {Number} port 默认80 
     * @param  {...any} rest 当为一个参数时，必须是回调函数，当有两个参数时，参数一是host，参数二是回调函数
     * @returns {ProxyHttp}
     */
    listen(port = 80, ...rest) {
        let host = 'localhost'
        let cb
        if (rest.length == 1) {
            cb = rest[0]
        }
        else if (rest.length == 2) {
            host = rest[0]
            cb = rest[1]
        }
        this.proxyServer = http.createServer(this.proxyServerListener).listen(port, host, () => {
            cb && cb()
        })

        return this
    }

    /**
     * 关闭服务器监听
     * 
     * @param {Function} cb 可选，关闭服务器监听后的回调函数
     * @returns {ProxyHttp}
     */
    close(cb) {
        this.proxyServer.close(() => {
            cb && cb()
        })

        return this
    }

    /**
     * 事件钩子监听
     * 
     * @param {String} hook hook名称，proxyRequest、proxyResponse和proxyError其中之一
     * @param {Function} handler hook的回调函数
     * @returns {ProxyHttp}
     */
    on(hook, handler) {
        switch (hook) {
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

module.exports = ProxyHttp