const fs = require('fs')
const Mock = require("./mock") 
const proxyRequest = require("./proxyRequest")
const loger = require('./loger')
const swagger = require('./swagger')

module.exports = function(rest) {
    return async function (req, res, next) {   
        let mockData = []
        let state = {}

        if(typeof rest === 'string') {
            let data = {}
            try {
                if(rest.indexOf('.json') > 0) {
                    data = JSON.parse(fs.readFileSync(rest, 'utf-8'))
                } else {
                    data = eval(fs.readFileSync(rest, 'utf-8'))
                }
            } catch(err) {
                loger(true, 'error', '请求配置文件失败')
            }
            mockData = data && data.mockData || []
            state = Object.assign({}, state, data.state)
        } else if(typeof rest === 'object') {
            mockData = rest.mockData
            state = Object.assign({}, state, rest.state)
            
        }

        if(mockData.length === 0) {
            loger(true, 'warn', '配置文件发生错误')
            return next() 
        }

        let isInterceptors = false
        let data = null

        if(!Array.isArray(mockData)) {
            mockData = [].push(mockData)
        }

        const md = mockData.find((val) => {
            if(val.url.indexOf("/*") >= 0) {
                let newUrl = val.url.replace("/*", "")
                state.configUrl = newUrl
                return req.path.indexOf(newUrl) === 0 && req.path != newUrl
            }
            state.configUrl = val.url
            return val.url === req.path
        })
        
        loger(true, 'help', '\n\n\n' + req.path + ':')

        if(!md) {
            loger(true, 'warn', '未匹配到连接', req.path)
            return next()
        } else {
            state.md = md
            state.getMockData = md.getMockData
            if(state.readFile === undefined) {
                state.readFile = true
            }
        }
        
        const interceptors = md.interceptors || state.interceptors
        if(interceptors && typeof interceptors === 'function') {
            isInterceptors = interceptors(state, req)
        }

        if(isInterceptors) {
            let data = typeof isInterceptors === "object" ? 
                        isInterceptors : 
                        { status: '400', msg:'is Interrupted'}

            res.json && res.json(data)
            return 
        } 

        const mock = new Mock(req, state)
        
        for(let key in md) {
            let res = md[key]
            if(key.indexOf('data|') >= 0) {
                let keys = key.split('|')
                let l = keys[1]
                if(typeof md[key] === 'function') {
                    res = md[key](req, state)
                }
                data = mock.array(res, l)
            } else if(key === 'data') {
                if(typeof md.data === 'function') {
                    res = md.data(req, state)
                }
                data = mock.object(res)
            }
        }
        
        req.mockData = data
        req.state = state 

        if(!state.md.validateWriteFile || typeof state.md.validateWriteFile != 'function') {
            state.md.validateWriteFile = () => true
        }

        if(state.debugger === true) {
            state.debugger = {
                method: ['get', 'post'],
                path: []
            }
        } else if(typeof state.debugger === 'object') {
            state.debugger.method =  state.debugger.method || ['get', 'post']
            state.debugger.path =  state.debugger.path || []
        }

        if(md.proxy) {
            loger(state.debugger, 'info', '进入代理模式', req.path)
            const query = req.query 
            const params = req.body
            const contentType = req.headers['content-type'] || req.headers['Content-Type']
            
            state.params = params
            state.query = query
            state.contentType = contentType

            proxyRequest(md, state, req, res)
            
            return 
        }
        
        if(state.swagger) {
            const swaggerData = await swagger(req, state, md)
            if(swaggerData && !req.mockData) {
                req.mockData = swaggerData
            }
        } 

        res.json(req.mockData)

        return 
    }
}