const { createReadStream, access, constants } = require('fs')
const { join, extname } = require('path')
const { HTTP_RESPONSE_CONTENT_TYPE_MAP } = require('../constant')
const { createGzip } = require('zlib')

/**
 * @description 搭建静态服务器的插件
 **/
class StaticFile {
    /**
     * 开启静态文件服务器
     * 
     * @param {IncomingMessage} req  http.createServer回调函数的第一个参数，请求数据可读流 
     * @param {ServerResponse} res   http.createServer回调函数的第二个参数，返回数据可写流
     * @param {string} opts.rootPath  指定文件目录作为服务器根目录，默认为'/'，即进程运行的的目录
     * @param {string} opts.homePage  当req的url为'/'时跳转的首页文件，默认为'index.html'
     * @param {boolean} opts.returnContentType  是否返回请求对应文件的content-type响应头，默认为true
     * @param {boolean} opts.gzip  是否对静态文件gzip压缩，默认为false
     * @param {string[]} opts.gzipExclude  忽略gzip压缩的文件后缀名list，默认为[]
     * @returns {Promise} then表示当前路径是否存在静态文件，会返回文件，reject表示当前路径不存在静态文件，会返回一个Error对象
     */
    static start(
        req,
        res,
        {
            rootPath = '/',
            homePage = 'index.html',
            returnContentType = true,
            gzip = false,
            gzipExclude = []
        } = {}
    ) {
        return new Promise((resolve, reject) => {
            const filePath = req.url == '/'
                            ? homePage
                            : req.url

            const reqPath = join(process.cwd(), rootPath, filePath)
            const ext = extname(reqPath).toLocaleLowerCase()
            if (returnContentType) {
                res.setHeader('Content-Type', this._getResponseContentType(ext))
            }
            access(reqPath, constants.F_OK | constants.R_OK, (err) => {
                if (!err) {
                    if (
                        gzip &&
                        req.headers['accept-encoding'].includes('gzip') &&
                        !gzipExclude.includes(ext)
                    ) {
                        this._handleGzip(reqPath, res, resolve, reject)
                    } else {
                        this._handleUnGzip(reqPath, res, resolve, reject)
                    }

                } else {
                    reject(err)
                }
            })
        })
    }

    static _getResponseContentType(ext) {
        return HTTP_RESPONSE_CONTENT_TYPE_MAP[ext] || ''
    }

    static _handleGzip(path, writeStream, resolve, reject) {
        writeStream.setHeader('Content-Encoding', 'gzip')
        const relativeGzPath = `${path}.gz`
        access(relativeGzPath, (err) => {
            if (err) {
                const stream = createReadStream(path)
                stream.pipe(createGzip())
                    .on('error', (err) => {
                        reject(err)
                    })
                    .pipe(writeStream)
                stream.on('data', () => {
                    resolve()
                })
                stream.on('error', (err) => {
                    reject(err)
                })
            } else {
                this._handleUnGzip(relativeGzPath, writeStream, resolve, reject)
            }
        })
    }

    static _handleUnGzip(path, writeStream, resolve, reject) {
        const stream = createReadStream(path)
        stream.pipe(writeStream)
        stream.on('data', () => {
            resolve()
        })
        stream.on('error', (err) => {
            reject(err)
        })
    }
}

module.exports = StaticFile
