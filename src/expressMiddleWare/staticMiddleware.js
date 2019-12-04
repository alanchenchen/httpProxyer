const staticPlugin = require('../core/staticServer')

/**
 * @description 基于staticServer扩展的express中间件，可以将请求转到下一个中间件
 * @param {string} rootPath  指定文件目录作为服务器根目录，默认为'/'，即进程运行的的目录
 * @param {string} homePage  当匹配到/路径时返回的文件，默认为'index.html'
 * @param {boolean} returnContentType  是否返回请求对应文件的content-type响应头，默认为true
 * @param {boolean} gzip  是否对静态文件gzip压缩，默认为false
 * @param {string[]} gzipExclude  忽略gzip压缩的文件后缀名list，默认为[]
 */
const middleWare = ({
    rootPath,
    homePage,
    returnContentType,
    gzip,
    gzipExclude
}) => {
    return async (req, res, next) => {
        try {
            await staticPlugin.start(req, res, {
                rootPath,
                homePage,
                returnContentType,
                gzip,
                gzipExclude 
            })
        } catch (error) {
            if(error) {
                // 路径匹配失败，中间件接着走
                next()
            }
        } 
    }
}

module.exports = middleWare