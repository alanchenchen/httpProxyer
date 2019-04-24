/**
 * 获取函数的形参名称字符串
 * 
 * @param {Function} fn 
 * @returns {Array} 包含所有形参字符串的数组
 */
const queryFunctionParams = fn => {
    const funcString = fn.toString()
    const regExp = /function\s*\w*\(([\s\S]*?)\)/
    const regExp2 = /\s*\w*\(([\s\S]*?)\)/

    if (regExp.test(funcString)) {
        const argList = RegExp.$1.split(',')
        return argList.map(arg => {
            return arg.replace(/\s/g, '')
        })
    }
    else if (regExp2.test(funcString)) {
        const argList = RegExp.$1.split(',')
        return argList.map(arg => {
            return arg.replace(/\s/g, '')
        })
    }
    else {
        return []
    }
}

module.exports = {
    queryFunctionParams
}