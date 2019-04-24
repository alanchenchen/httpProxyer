const ProxyHttp = require('./ProxyHttp')

/**
 * @description httpProxyer plugin
 * @method createProxyServer function(target Object) ProxyHttpInstance  
 * @method proxy function(readStream IncomingMessage, writeSteam ServerResponse, target Object) ProxyHttpInstance 
 */
const HttpProxyPlugin = {
    /**
     * 启用一个服务器事件监听器，必须调用listen方法才能开启服务器监听并代理转发
     * 
     * @param {Object} opts 可选参数
     * @param {URL} opts.target 必选，必须是代理服务器的http地址，例如：http://127.0.0.1:7070
     * @param {Boolean} opts.inherit 可选，转发请求是否继承当前target的query和hash信息
     * @returns {ProxyHttp Instance} 可以链式调用，必须调用listen方法，才会启用服务器监听
     */
    createProxyServer({ target, inherit }) {
        return new ProxyHttp().createListener({ target, inherit })
    },
    /**
     * 代理转发已有服务器的请求,可以实现反向代理和负载均衡
     * 
     * @param {ReadStream} readStream 可读流，Http Server类request事件的第一个参数req
     * @param {WriteSteam} writeSteam 可写流，Http Server类request事件的第二个参数res
     * @param {Object} opts 可选参数
     * @param {URL} opts.target 必选，必须是代理服务器的http地址，例如：http://127.0.0.1:7070
     * @param {Boolean} opts.inherit 可选，转发请求是否继承当前target的query和hash信息
     * @returns {ProxyHttp Instance} 可以链式调用，可以使用on来监听事件
     */
    proxy(readStream, writeSteam, { target, inherit }) {
        return new ProxyHttp()
            .createListener({ target, inherit })
            .proxyServerListener(readStream, writeSteam)
    }
}

module.exports = HttpProxyPlugin