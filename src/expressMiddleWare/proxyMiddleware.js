const proxyPlugin = require('../core/proxy/index')

/**
 * 基于httpProxyer扩展的express中间件，支持事件监听。注意：此中间件后面无法再继续处理中间件，因为res已经被处理了
 * 
 * @param {Object} opts 配置参数
 * @param {URL} opts.target 必选，目标服务器地址
 * @param {Boolean} opts.inherit 可选，转发请求是否继承当前target的query和hash信息
 * @param {Object} opts.hooks key是事件名，value是function。用法与httpProxyer事件监听一致
 */ 
const middleWare = ({target, inherit, hooks={}} = {}) => {
    return (req, res) => {
        const ins = proxyPlugin.proxy(req, res, {
            target,
            inherit
        })

        const reqEv = hooks['proxyRequest']
        const resEv = hooks['proxyResponse']
        const errEv = hooks['proxyError']
        
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