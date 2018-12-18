const http = require('http')
const { parse } = require('url')
const version = require('../package.json').version

const NeedRequestBodyMethods = ['PUT', 'POST', 'PATCH']

/**
 * @description 获取函数的形参名称字符串
 * @param {Function} fn 
 * @returns {Array} 包含所有形参字符串的数组
 */
const queryFunctionParams = fn => {
    const funcString = fn.toString()
    const regExp =/function\s*\w*\(([\s\S]*?)\)/
    const regExp2 =/\s*\w*\(([\s\S]*?)\)/

    if(regExp.test(funcString)) {
        const argList = RegExp.$1.split(',')
        return argList.map(arg => {
            return arg.replace(/\s/g,'')
        })
    }
    else if(regExp2.test(funcString)) {
        const argList = RegExp.$1.split(',')
        return argList.map(arg => {
            return arg.replace(/\s/g,'')
        })
    }
    else {
        return []
    }
}

class ProxyHttp {
    constructor() {
        this.version = version
        this.createdBy = 'alanchenchen@github.com'
        this.proxyEvents = {}
    }

    /**
     * @description 转发请求并写入响应数据到指定可写流
     * @param {Object} options request请求的配置参数，包含请求头
     * @param {String | Buffer} body 请求内容 
     * @param {WriteStream} writeStream 需要写入返回数据的可写流
     */
    _clientRequest(options, reqBody, writeStream) {
        const ClientRequest = http.request(options, res => {
            /**
             * proxy server转发请求到target server，返回响应头，httpCode以及响应体
             */
            const responseHeaders = res.headers
            const responseStatusCode = res.statusCode

            writeStream.statusCode = responseStatusCode
            Object.entries(responseHeaders).forEach(item => {
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
            const proxyResponseData = {
                    headers: responseHeaders,
                    statusCode: responseStatusCode
            }
            const resFnStr = this.proxyEvents['proxyResponse']
                          && this.proxyEvents['proxyResponse'].toString()
            const proxyResStr = resFnStr
                             && queryFunctionParams(resFnStr)[0]
            const resRegExpRule = new RegExp(`(${proxyResStr}\.(write|end)|pipe\.${proxyResStr})`)
            const shouldResponseSourceChunks = !this.proxyEvents['proxyResponse'] || !resRegExpRule.test(resFnStr)

            if(this.proxyEvents['proxyResponse']) {
                this.proxyEvents['proxyResponse'](writeStream, res, proxyResponseData)
            }
            if(shouldResponseSourceChunks) {
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

        if(this.proxyEvents['proxyRequest']) {
            const proxyRequestData = options
            this.proxyEvents['proxyRequest'](ClientRequest, proxyRequestData)
        }
        if(shouldRequestSourceChunks) {
            // 仅当请求是POST、PUT或PATCH，proxy server发出请求带上请求体信息
            if(NeedRequestBodyMethods.includes(options.method)) {
                reqBody.forEach(body => {
                    if(typeof body == 'string' || Buffer.isBuffer(body)) {
                        ClientRequest.write(body)
                    }
                })
            }
        }
        ClientRequest.end()
        
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

    createListener(target) {
        try {
            parse(target, true)
        } 
        catch (error) {
            throw new Error('target server must be an URL string')
        }

        this.targetServer = target

        this.proxyServerListener = (req, res) => {
            const { slashes, pathname, href, hash, search, query, ...TARGET_SERVER_OPTIONS } = parse(this.targetServer, true)
            const { method, url, headers } = req
            const { path } = parse(url, true)

            // 通过proxy server的接收请求可读流，读取出请求体信息
            let reqBody = [] // 为了避免请求体是buffer的情况，所以不能用字符串拼接
            req.on('data', chunk => {
                reqBody.push(chunk)
            })

            // 必须保证proxy server的接收请求数据读取完毕后才能发出请求，否则reqBody为空
            req.on('end', () => {
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

            req.on('error', (e) => {
                // 插件的proxyError事件在接收请求，发生错误触发
                this.proxyEvents['proxyError']
                && this.proxyEvents['proxyError'](e, 'client')
            })

            return this
        }

        return this
    }

    listen(port=80, ...rest) {
        let host = 'localhost'
        let cb
        if(rest.length == 1) {
            cb = rest[0]
        }
        else if(rest.length == 2) {
            host = rest[0]
            cb = rest[1]
        }
        this.proxyServer = http.createServer(this.proxyServerListener).listen(port, host, () => {
            // console.log(`proxy server http://${host}:${port} to ${this.targetServer} is running...`)
            cb && cb()
        })

        return this
    }

    close(cb) {
        this.proxyServer.close(() => {
            cb && cb()
        })
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

/**
 * @description 模块默认导出的对象
 * @method createProxyServer function(target Object) ProxyHttpInstance  
 * @method proxy function(readStream IncomingMessage, writeSteam ServerResponse, target Object) ProxyHttpInstance 
 */ 
const HttpProxyPlugin = { 
    /**
     * @description 启用一个服务器事件监听器，必须调用listen方法才能开启服务器监听并代理转发
     * @param {URL} target 必须是代理服务器的http地址，例如：http://127.0.0.1:7070
     * @returns {ProxyHttp Instance} 可以链式调用，必须调用listen方法，才会启用服务器监听
     */
    createProxyServer({target}){
        return new ProxyHttp().createListener(target)
    },
    /**
     * @description 代理转发已有服务器的请求,可以实现反向代理和负载均衡
     * @param {ReadStream} readStream 可读流，Http Server类request事件的第一个参数req
     * @param {WriteSteam} writeSteam 可写流，Http Server类request事件的第二个参数res
     * @param {URL} target 必须是代理服务器的http地址，例如：http://127.0.0.1:7070
     * @returns {ProxyHttp Instance} 可以链式调用，可以使用on来监听事件
     */
    proxy(readStream, writeSteam, {target}) {
        return new ProxyHttp()
                    .createListener(target)
                    .proxyServerListener(readStream, writeSteam)
    } 
}

module.exports = HttpProxyPlugin