# freeMock.js

#### What can you do with freeMock

Automatically refresh the data every time the API is called

Generating data from the user's params

Analog login operation


##### Quick get start

server.js

```
app.use(freeMock(config))
```
config.js

```
module.exports = {
    mockData: [{
        url:'/test1',
        method:'GET',
        "data|<2": {
            name: "@name()",
            "list|<req.size": {
                title:"@title()",
                time: "@time()",
                height: "@number(2)"
            }
        }
    }, {
        url: '/wolong',
        method: 'GET',
        data: {
            name: "123",
            template: "456"
        }
    }, {
        url:'/wolong123/plan/list',
        proxy: 'https://ad-test1.sma.cn',
        method: 'GET',
        port: '443',
        headers: {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'ad-test1.sm.cn',
            'Referer': 'https://ad-test1.sm.cn/cpc/static/index.html?uid=1061',
            'Cookie': '3428.1539223421.'
        }
    }],
    state: {
        
    }
}
```

### 配置文件
config 是一个对象：
```
{
    mockData //代表需要配置的接口，以及返回的数据
    state  //接口需要的公共属性
}
```
### mockData：
mockData 是一个对象数组。
```
[
    {
        url     // 必需，接口的路径。例如 /A 注意前面要加 “/”
        data    // 默认为 {}。代表接口返回的数据。必须是一个 json 数据。 value可以是 function，但是 function 必须有返回值。
        method  // 不设代表 get Post .. 都可以
        proxy   // 代理开关，当为 true 时，将使用 state 里配置的代理方式。当为字符串时，使用当前方式。不设，代表不走代理。
        port    // 代理请求的 port
        headers // 代理请求的 headers
    }
]
```
####  demo分析

demo1
```
mockData = [
    {
        url: '/getData',
        data: {
            name: 'cxh',
            age: '21'
        }
    }
]
```
请求 localhost:8080时，返回 data 的 json 数据，method 不限。

动态数据：
```
mockData = [
    {
        url: '/getData',
        data: {
            name: '@name()',
            age: '@number(0, 1, 99)'
            id: '@number(0, 10000, 999999)
        }
    }
]
```
@代表是识别调用 function 的标识
name： 随机生成一个人名

数组：
```
{
    url: '/getData',
    'data|9': {
        name: '@name()',
        age: '@number(0, 1, 99)',
        id: '@number(0, 10000, 999999),
        'source|<9': '@title()'
    }
}
```
key 值中出现 | 代表这是一个数组，数组的元素是 value 值。
比如 data|9，代表data是一个长度为 9 的数组，数组的元素是，后面的 mock 对象生成的数据。
“|”可以配合 “<"、“>”、“<=”、“>=” 使用。
source|<9 代表 source 是一个长度小于 9 的数组。注意此处没有设置[]。

操控动态数据：
```
{
    url: '/getData',
    'data|req.pageSize': {
        pageNo: '@params(pageNo)',
        maxPage: function(ctx, state) {
            return ctx.query.maxPage
        }
    }
}
```
在 key 中，可以直接使用 req，来获取我们调用接口传递的参数。例如：
调用 http://localhost:3002/test1?pageSize=12&pageNo=10&maxPage=100 
但是只有在 key 值当中使用时，才可以直接使用 req。如果想在 value 中使用可以仿照上例中 pageNo 和 maxPage 调用。
@params(pageNo): params 方法可以获取 pageNo 的值。相当于 req.pageNo
当值为 function 时，可以在函数体内使用 ctx 获取。
ctx 可以理解成 node 的 req。函数的返回值就是生成的 mock 数据，第二个 state 后面会提到。

当我们 post 数据的时候有传递的参数可能会是一个对象。那么 req 可以获取对象的值么？
答案是肯定的。
```
'data|req.page.pageSize'
```
而 params 方法也可以接受多个参数，例如：
```
 pageNo: '@params(page, pageNo)' // 相当于 req.page.pageNo
```

自定义方法:
有些时候已有的方法我发满足我们的需求，我们希望自己定制方法 getName
 ```
  {
    state: {
        plugin: {
            "getName": function(name) {
                return this.ctx.query.name || name
            }
        }
    }
  }
 ```
 使用 getName：
```
{
    url:'/test1',
    method:'GET',
    "data|<2": {
        name: "@name()",
        "list|<req.size": {
            title:"@title()",
            name: "@getName(chenxuehui)"
        }
    }
}
```

#### 代理

```
{
    url:'/wolong123/plan/list',
    proxy: 'https://ad-test1.ok.cn', 
    method: 'GET',
    port: '443',
    headers: {
        Cookie: "asdsads"
    }
}
```
proxy 有两种值。
当 proxy 为 true 的时候，表示此 api 走代理。会使用公共的 state.proxy。同样的，假如你的 port、headers 都没有设置，都会去state里找。
当设置为字符串的时候（如上）优先使用。
不设置就直接返回 data 生成的数据。
在 api 配置的对象里设置的属性优先级要高。
state 
```
{
    port: '443',
    headers: {
        Cookie: "asdsads"
    }
}
```
### state
state 可以配置 proxy、port、headers、Cookie、plugin 等。
因为我们可以再配置 data 的 function 里面使用 state，例如：
```
{
    id: function(ctx, state) {}
}
```
在 plugin 里面也可以使用：

```
{
    state: {
        plugin: {
            "getName": function(name) {
                return this.state.name || name
            }
        }
    }
  }
```
所以我们可以设置一些属性完成一些功能。

例如：

```
state: {
    username:'cxh',
    password:'123456',
    isLogin: false,
    interceptors: function(state) {
        if(!state.isLogin) {
            return {
                status: 101,
                msg: '没有登录'
            }
        } else {
            return false
        }
    }
}
```
mockData: 
```
[
    {
        url: '/login',
        interceptors: function(state, req) {
            if(
                req.query.name === state.username &&
                req.query.password === state.password
            ) {
                state.isLogin = true
            }
            return {
                msg:'登陆成功'
            }
        }
    }, {
        url: '/logout',
        interceptors: function(state, req) {
            state.isLogin = false
            return {
                msg:'登出成功'
            }
        }
    }
]
```
interceptors: 是一个打断接口的 api，下面有介绍。
这样就模拟了登录效果
### API
interceptors: 
是一个function， 接受两个参数 req、state。
返回 false 的时候不会打断接口。
当返回的值判定为true的时候，接口会返回该值。
如果返回值为 true，那么接口会返回 
```
{ status: '400', msg:'is Interrupted'}
```
name()： 随机生成人名

title()：随机生成一串字符

number()：随机生成一个数字

number(n)：随机生成精确到小数点后n位的数字

number(a,b,c)：在a，b的范围内随机生成精确到小数点后c位数字

string()：随机生成一串字符串

string(2)：随机生成2个英文字符

string(a, b)：a=true，随机生成b个大写英文字符

boolean()：随机生成一个boolean值

boolean(a)：如果a=true则返回true，否则返回false

.
.
.
.