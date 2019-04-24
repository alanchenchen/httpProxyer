const { createReadStream } = require('fs')
const { join } = require('path')

/**
 * @description 搭建静态服务器的插件
 * @class
 *  @static 
 *   @method start 开启静态文件服务器
 *     @param {IncomingMessage} req  http.createServer回调函数的第一个参数，请求数据可读流
 *     @param {ServerResponse} req   http.createServer回调函数的第二个参数，返回数据可写流
 *     @param {Object} opts 包含两个可选key
 *     @param {Object} opts.rootPath  指定文件目录作为服务器根目录，默认为'/'，即进程运行的的目录
 *     @param {Object} opts.homePage  当req的url为'/'时跳转的首页文件，默认为'index.html'
 *     @returns {Promise} then表示当前路径是否存在静态文件，会返回文件，reject表示当前路径不存在静态文件，会返回一个Error对象
 **/
class StaticFile {
    static start(req, res, { rootPath='/', homePage='index.html' } = {}) {
        return new Promise((resolve, reject) => {
            const filePath = req.url == '/'
                            ? homePage
                            : req.url

            const reqPath = join(process.cwd(), rootPath, filePath)
            
            const stream = createReadStream(reqPath)
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            stream.pipe(res)
            stream.on('data', () => {
                resolve()
            })
            stream.on('error', (err) => {
                reject(err)
            })
        })
    }
}

module.exports = StaticFile
