const staticPlugin = require('../core/staticServer')

/**
 * @description 基于staticServer扩展的express中间件，可以将请求转到下一个中间件
 * @param {Object} opts 可选，rootPath表示文件服务器根目录，homePage表示当匹配到/路径时返回的文件
 */
const middleWare = ({rootPath, homePage}={}) => {
    return async (req, res, next) => {
        try {
            await staticPlugin.start(req, res, {
                rootPath,
                homePage 
            })
        } catch (error) {
            if(error) {
                // 路径匹配失败，转发代理请求
                next()
            }
        } 
    }
}

module.exports = middleWare