# Mix


根据用户配置自动混淆代码中的选择器名称，包括类html、css和js文件的自动混淆，支持多种过滤形式和自定义混淆处理，可利用此库自行开发编译工具插件，示例请参见:
 - [fis-prepackager-random-dom](https://github.com/hahayuting/fis-prepackager-random-dom)

## 使用方法
### 安装
执行`npm install -g random-dom-mix`安装插件

### 配置参数详细说明
 - list: [ ] || '' ;`必填` 指定进行混淆的widget下的路径，支持正则 (只支持一种string类型的内容－'./*',表示处理所有文件)
 ```javascript
    // for example:
    // fis:
    list: [
        'widget/test',
        /widget\/dialog\/.*\.js/
    ]
```
**以下是传入的跟打包工具相关的处理参数**
 - resource: { } ;`必填` 文件资源对象
```javascript
    // for example:
    // fis:
    ret.id[fileKey] = { };  
    ret.id[moduleName:widget/xx/xx.js] = {
        realpath: 'Document/moduleName/widget/xx/xx.js',
        _content: 'xxxxx'
    }
    // webpack:
    compilation.assets[filename] = source;
```
 - pathKey: '' ; 文件的key值，看不同编译工具的数据结构处理，如上。如果不传入这个，则默认是使用resource对象的key值作为文件标志(即文件名)
 - getFileContent: Function ;`必填` 获取单个文件的内容.因为不同打包处理工具的文件资源对象数据格式不同，所以由具体插件编写者来定义
```javascript
    // fis:
    getFileContent: function (fileItem) {
        return fileItem._content;
    }
```
 - setFileContent: Function ;`必填` 设置文件的内容
 ```javascript
    // fis:
    setFileContent: function (fileItem, data) {
        fileItem._content = data;
    }
```
**以下是处理过程中需要的判断参数**
 - ignore: { }; 不进行混淆的选择器
```javascript
    ignore:{
        name: ['.test', '.clearfix', '#test'],
        classReg: [/^global-.+/]
    }
```
 - onlyMixClass: [ ] ; 只对指定的类名进行混淆
```javascript
    onlyMixClass: ['module-test', /^module-.+/]
```
 - jsPrefix: [ ] ; 对有特殊前缀的进行处理，因为在js中有些写法无法匹配到，以此标志进行识别`此项需要用户排查代码添加前缀`
```javascript
    jsPrefix:['JS-']
```
 - randomStrLen: Number; 被混淆后的随机字符串的长度，不填默认为6位
 - randdomStrMaxLen: Number; 随机字符串的最大长度，用它来指定长度的变化范围[randomStrLen, randdomStrMaxLen], 不填默认8位
 - mixNameFun: Function ; 用户自定义选择器名称的混淆方法
 - customMix { }; 这里设置的选择器才会被mixNameFun进行混淆处理，支持正则
```javascript
    customMix: {
        name: ['module-test', /^frame-.+/],
        path: [/\/test\/.*test.(css|js)/i]
    }
```
 - mixAttr: [ ]; 需要混淆的属性值。 对于自定义混淆的属性，因为属性值不涉及到跨模块使用，所以不支持ignore配置。并且只支持简单的选择器写法以及attr这种，如发现不符合要求，可自行扩展mixer。only be processed in html & js [String or Array]
```javascript
    mixAttr: ['data-id']
```
 - mixer: { }; 感觉功能无法被满足，可以自定义混淆逻辑
```javascript
    mixer: {
        js: [function(code) {
            // var map = this.map; // 混淆前后索引表, map.id, map.class
            // do the process
            return code;
        }],
        html: [],
        css: []
    }
```
 - getProcessedResult: Function; 调试方法，获取处理结果的map表。对于处理结果比较多的，建议单个组件进行调试。
```javascript
    getProcessedResult: function (map, customMap) {
        console.log(map.id, map.class);
        console.log(customMap.id, customMap,class);
    }
```

### 使用效果

#### 自动替换模板文件中的样式选择器(id|class="xxx"), 同步替换对应css中的选择器

**开发代码：**

```html
    <style>
        #id-test {
            color: red;
        }
        .module-test {
            position: relative;
        }
    </style>
    <div class="module-test ignore-test" id="id-test"></div>
```

**编译后：**
```html
    <style>
        #dU9d2K {
            color: red;
        }
        .KD9eiR {
            position: relative;
        }
    </style>
    <div class="KD9eiR ignore-test" id="dU9d2K"></div>
```

#### 自动替换JS代码中的选择器名称
 - 自动匹配原生JS方法getElementsByClassName、getElementById、setAttribute中的class|id
 - 自动匹配jquery方法中的(add|remove|has|toggle)Class对应的一个或多个class
 - 自动匹配jquery方法中的$('')及find('')等写法中对应的一个或多个class
 - 支持自定义js前缀匹配,用于匹配无特殊标志的js写法(详见`jsPrefix`介绍)
 - 支持属性值的混淆(详见`mixAttr`介绍)
 - 支持自定义混淆逻辑(详见`mixer`介绍)

**开发代码：**

```javascript
    var a = document.getElementsByClassName('module-test');
    var b = $('.module-test2');
    b.addClass('style-test style-test2');
    // 配置的jsPrefix: ['JS-']
    var className1 = 'JS-test1';
    var className2 = className1 + ' JS-test2';
    // 可配置mixAttr: ['data-test']，来混淆属性中的值
    b.html('<div class="' + className2 + '" data-test="attr-test">');
```

**编译后:**

```javascript
    var a = document.getElementsByClassName('de93SIL');
    var b = $('.Lkj9cn');
    b.addClass('ogPy3k KSwjd9');
    // 配置的jsPrefix: ['JS-']
    var className1 = 'k8dNHG';
    var className2 = className1 + ' lcjWSo';
    // 可配置mixAttr: ['data-test']，来混淆属性中的值
    b.html('<div class="' + className2 + '" data-test="bhg7YT">');
```



### 处理情况说明
处理的文件内容可以分为两种：
 - 一种是经过打包工具处理的文件资源对象
 - 一种是原生的本地文件资源
因为编译过程不会直接修改本地文件，所以不支持第二种，但如果有这种需求可以自己构造resource和list


### 对开发过程的影响
 - js代码中无法匹配的写法, 即没有特殊标志的需要手动添加自己在jsPrefix里配置的前缀
 ```javascript
 // 如下代码没有无法匹配到：
 var className = 'module-test';
 // 如果jsPrefix配置为'JS-',需要改写为
 var className = 'JS-module-test';
 ```
 - 代码中有设置颜色属性的，如下这种，需要自己在配置里ignore掉
 ```javascript
 $header.css('color', '#6EB562');
 // ignore的配置中需要加上
ignore: {
    name : ['#6EB562']
}
 ```
 - css注释中使用要规范，不要使用//, 应使用/**/




