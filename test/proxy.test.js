const assert = require('assert')
const http = require('http')
const proxyPlugin = require('../src/index').httpProxyer

describe('httpProxyer', function() {
    // target server 7070
    const targetServer = http.createServer((req, res) => {
        const reqHeaders = req.headers
        // return the headers from request info
        Object.entries(reqHeaders).forEach(item => {
            res.setHeader(item[0], item[1])
        })
        res.writeHead(200, {
            'Content-Type': 'text/plain;charset=utf8'
        })
        res.end(JSON.stringify({
            port: 7070,
            msg: 'success'
        }))
    }).listen(7070)
    
    describe('init one inner proxy server, use createProxyServer()', function() {
        let server
        afterEach(function() {
            server.close()
        })
        it('should proxy server 7070 to server 3000', function(done) {
            // proxy server 3000
            server = proxyPlugin.createProxyServer({
                target: 'http://localhost:7070'
            }).listen(3000)
    
            // GET request to server 3000
            http.get('http://localhost:3000', res => {
                res.on('data', chunk => {
                    const portNum = JSON.parse(chunk).port
                    const msg = JSON.parse(chunk).msg
    
                    assert.equal(portNum, 7070) && assert.equal(msg, 'success')
                    done()
                })
                res.on('error', err => {
                    done(err)
                })
            })
        })
    })

    describe('proxy an existing server, use proxy()', function() {
        let server
        afterEach(function() {
            server.close()
        })
        it('should proxy server 7070 to server 3001', function(done) {
            // proxy server 3001
            server = http.createServer((req, res) => {
                proxyPlugin.proxy(req, res, {
                    target: 'http://localhost:7070'
                })
            }).listen(3001)
    
            // GET request to server 3001
            http.get('http://localhost:3001', res => {
                res.on('data', chunk => {
                    const portNum = JSON.parse(chunk).port
                    const msg = JSON.parse(chunk).msg
    
                    assert.equal(portNum, 7070) && assert.equal(msg, 'success')
                    done()
                })
                res.on('error', err => {
                    done(err)
                })
            })
        })
    })

    describe('use the event hooks by on()', function() {
        // proxy server 3002
        let server = http.createServer((req, res) => {
            const ins = proxyPlugin.proxy(req, res, {
                target: 'http://localhost:7070'
            })

            /**
             * since GET method has no body, if you wanna test the proxyRequest hook to rewrite the request body, add a POST request by yourself.
             */

            // proxyRequest hook, you can rewrite the request data or only fetch request headers and request body.
            ins.on('proxyRequest', (proxyReq, opts) => {
                proxyReq.setHeader('whomai', 'httpProxyer')
                proxyReq.end()
            })

            // proxyResponse hook, you can rewrite the response data or only fetch response headers and httpCode.
            ins.on('proxyResponse', (proxyRes, res, opts) => {
                proxyRes.write('response data has been rewriten')
                proxyRes.end()
            })
        }).listen(3002)

        it('should intercept the res data', function(done) {
            // GET request to server 3002
            http.get('http://localhost:3002', res => {
                res.on('data', chunk => {
                    assert.equal(chunk, 'response data has been rewriten')
                    done()
                })
                res.on('error', err => {
                    done(err)
                })
            })
        })
        it('should intercept the req data', function(done) {
            // GET request to server 3002
             http.get('http://localhost:3002')

            // targetServer 7070 resolve the request info
            targetServer.on('request', (req, res) => {
                const whomai = req.headers['whomai']
                server.close()
                assert.equal(whomai, 'httpProxyer')
                done()
            })
        })
    })

    after('if all tests succeed, close the http process', function() {
        targetServer.close()
    })

})