const { createReadStream } = require('fs')
const { join } = require('path')

/**
 * @description 搭建静态服务器的工具类
 * @class
 *  @static 
 *   @method start 开启静态文件服务器
 *     @param {IncomingMessage} req  http.createServer回调函数的第一个参数，请求数据可读流
 *     @param {ServerResponse} req   http.createServer回调函数的第二个参数，返回数据可写流
 *     @param {Object} 包含两个可选key
 *                  rootPath => 指定文件目录作为服务器根目录，默认为'/'
 *                  homePage => 当req的url为'/'时跳转的首页文件，默认为'index.html'
 **/
class StaticFile {
    static start(req, res, { rootPath='/', homePage='index.html' } = {}) {
        return new Promise((resolve, reject) => {
            const filePath = req.url == '/'
                            ? homePage
                            : req.url
            console.log(filePath)
            const reqPath = join(__dirname, rootPath, filePath)
    
            const stream = createReadStream(reqPath)
            stream.pipe(res)
            stream.on('data', () => {
                resolve(true)
            })
            stream.on('error', () => {
                resolve(false)
            })
        })
    }
}

module.exports = StaticFile
