const proxyPlugin = require('../core/proxy')

/**
 * @description 基于httpProxyer扩展的express中间件，支持事件监听。注意：此中间件后面无法再继续处理中间件，因为res已经被处理了
 * @param {URL} target 目标服务器地址
 * @param {Object} events key是事件名，value是function。用法与httpProxyer事件监听一致
 */
const middleWare = (target, events={}) => {
    return (req, res) => {
        const ins = proxyPlugin.proxy(req, res, {
            target
        })

        const reqEv = events['proxyRequest']
        const resEv = events['proxyResponse']
        const errEv = events['proxyError']
        
        const validate = v => {
            return Boolean(v) && Object.prototype.toString.call(v) == '[object Function]'
        }
        
        if(validate(reqEv)) {
            ins.on('proxyRequest', reqEv)
        }
        if(validate(resEv)) {
            ins.on('proxyResponse', resEv)
        }
        if(validate(errEv)) {
            ins.on('proxyError', errEv)
        }
    }
}

module.exports = middleWare