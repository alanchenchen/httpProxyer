const http = require('http')
const querystring = require('querystring')
const HttpProxyPlugin = require('./proxy')

let n = 0
const GET = ({data={}, path='/', port=8080, host='localhost'} = {}) => {
    const opts = `http://${host}:${port}${path}`
    const url = Object.keys(data).length>=1
                ? `${opts}?${querystring.stringify(data)}`
                : opts
    http.get(url, res => {
            // console.log('请求方式： GET')
            // console.log(`请求地址：${url}`)
            // console.log(`状态码: ${res.statusCode}`)
            // console.log(`状态码信息: ${res.statusMessage}`)
            // console.log(`响应头: ${JSON.stringify(res.headers)}`)
        n++
        res.on('data', chunk => {
            console.log(`响应主体: ${chunk}`)
        })
        res.on('end', () => {
            console.log(`第${n}次请求响应成功！`)
            // console.log('响应中已无数据')
        })
    })
}

const POST = ({data={}, path='/', port=8080, host='localhost', headers={}} = {}) => {
    let postData 
    const opts = {
        hostname: host,
        port,
        path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
        }
    }
    const CONTENT_TYPE = opts.headers['Content-Type']

    switch(CONTENT_TYPE) {
        case 'application/x-www-form-urlencoded': 
            postData = querystring.stringify(data)
            break
        case 'application/json': 
            postData = JSON.stringify(data)
            break
    }

    const req = http.request(opts, (res) => {
        console.log('请求方式： POST')
        console.log(`请求地址：http://${opts.hostname}:${opts.port}`)
        console.log(`状态码: ${res.statusCode}`)
        console.log(`状态码信息: ${res.statusMessage}`)
        console.log(`响应头: ${JSON.stringify(res.headers)}`)
        res.on('data', (chunk) => {
            console.log(`响应主体: ${chunk}`)
        })
        res.on('end', () => {
            console.log('响应中已无数据')
        })
    })
    
    req.on('error', (e) => {
        console.error(`请求遇到问题: ${e.message}`)
    })
    
    // 将数据写入到请求主体。
    req.write(postData)
    req.end()
}

const PORT = 3000
for(let i=1; i<=3000; i++) {
    GET({
        data: {
            from: 8080,
            to: 7070,
            test: 'test-proxy-http-server...'
        },
        path: '/proxy',
        port: PORT
    })
}

// for(let i=0; i<1000; i++) {
//     POST({
//         data: {
//             hi: 'chen',
//             from: 'hihihi'
//         },
//         port: PORT,
//         host: '192.168.0.43',
//         headers: {
//             'Content-Type': 'application/json'
//         }
//     })
// }
