'use strict';

var fs = require('fs');
var pth = require('path');
var css_parser = require("css-parse");
var Hashids = require('hashids');

var fileUtil = {
    exist: fs.existsSync || pth.existsSync,
    TEXT_FILE_EXTS: [
        'css', 'tpl', 'js', 'php',
        'txt', 'json', 'xml', 'htm',
        'text', 'xhtml', 'html', 'md',
        'conf', 'po', 'config', 'tmpl',
        'coffee', 'less', 'sass', 'jsp',
        'scss', 'manifest', 'bak', 'asp',
        'tmp', 'haml', 'jade', 'aspx',
        'ashx', 'java', 'py', 'c', 'cpp',
        'h', 'cshtml', 'asax', 'master',
        'ascx', 'cs', 'ftl', 'vm', 'ejs',
        'styl', 'jsx', 'handlebars'
    ],
    formatFilePath: function (path) {
        if (path == null || typeof path !== 'string') {
            util.errorLog('path is required and it sholud be the string type');
        }
        if (path) {
            path = pth.normalize(path.replace(/[\/\\]+/g, '/')).replace(/\\/g, '/');
            if(path !== '/'){
                path = path.replace(/\/$/, '');
            }
        }
        return path;
    },
    isTextFile: function (path) {
        path = fileUtil.formatFilePath(path);
        return fileUtil.TEXT_FILE_EXTS.indexOf(fileUtil.getFileExt(path)) > -1;
    },
    getFileExt: function (path) {
        var ext = '';
        var pos;
        path = fileUtil.formatFilePath(path);
        if ((pos = path.lastIndexOf('.')) > -1) {
            ext = path.substring(pos + 1).toLowerCase();
        }
       return ext;
    },
    getFileContent: function (path) {
        return false;

        var content = false;
        path = fileUtil.formatFilePath(path);
        if (fileUtil.exist(path)) {
            content = fs.readFileSync(path, 'utf-8');
        }
        else {
            util.errorLog('unable to read file [' + path + ']: No such file or directory.');
        }
        return content;

    },
    setFileContent: function (file, data) {
        // fs.writeFileSync(path, data, null);
    },
    getFileType: function (path) {
        path = fileUtil.formatFilePath(path);
        var fileType = {
            isHtmlLike: false,
            isJsLike: false,
            isCssLike: false,
            isJsonLike: false
        };
        if (fileUtil.isTextFile(path)) {
            var fileExt = fileUtil.getFileExt(path);
            switch(fileExt){
                case 'js':
                case 'jsx':
                case 'coffee':
                    fileType.isJsLike = true;
                    break;
                case 'css':
                case 'less':
                case 'sass':
                case 'styl':
                case 'scss':
                    fileType.isCssLike = true;
                    break;
                case 'html':
                case 'xhtml':
                case 'shtml':
                case 'htm':
                case 'tpl':   //smarty template
                case 'ftl':   //freemarker template
                case 'vm':    //velocity template
                case 'php':
                case 'jsp':
                case 'asp':
                case 'aspx':
                case 'ascx':
                case 'cshtml':
                case 'master':
                    fileType.isHtmlLike = true;
                    break;
                case 'json':
                    fileType.isJsonLike = true;
                    break;
            }
        }
        return fileType;
    }
};
var fileProcess = {
    // 获取符合条件要进行处理的文件
    // resource－{[Object]}  [文件资源，每个fileObj需要包含文件的绝对路径]
    // list－{[Array]}  [要处理的一组文件列表，外部对不同组的list进行处理, 只支持一种string类型的内容－'./*',表示处理所有文件]
    // pathKey－{[String]}  [标志文件路径的key，如果不传入这个，则默认是使用resource对象的key值作为文件标志(即文件名)]
    getAllFiles: function (resource, list, pathkey) {
        if (!(resource instanceof Object) || !(list instanceof Array || typeof list === 'string')) {
            util.errorLog("please check your argument type");
        }
        if (pathkey != null && typeof pathkey !== 'string') {
            util.errorLog("please check your pathkey type");
        }
        var files = [];
        // pathkey = pathkey || 'realpath';
        if (resource && list) {
            util.map(resource, function (key, file) {
                // 如果不传入这个，则默认是使用resource对象的key值作为文件标志(即文件名)
                var path = pathkey != null ? file[pathkey] : key;
                if (path != null) {
                    if (typeof list === 'string' && list === './*') {
                        files.push(key);
                    }
                    else if (list instanceof Array) {
                        list.forEach(function (confPath) {
                            if (typeof confPath === 'string') {
                                if(path.indexOf(confPath) > -1){
                                    // files[path] = file;
                                    files.push(key);
                                }
                            }
                            else if (confPath instanceof RegExp) {
                                if (confPath.test(path)) {
                                    // files[path] = file;
                                    files.push(key);
                                }
                            }
                        });
                    }
                }
                else {
                    util.errorLog("fileObj should have path, please cheack [pathKey] in your config");
                }
            });
        }
        return files;
    },
    getFileHandler: function () {

    }
};
var util = {
    map: function(obj, callback, merge){
        var index = 0;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (merge) {
                    callback[key] = obj[key];
                } else if(callback(key, obj[key], index++)) {
                    break;
                }
            }
        }
    },
    // 获取随机长度的字符串
    getRandomStr: function (len) {
        var str = '';
        len = len || 5;
        for (var i = 0; i < len; i++) {
            str+= String.fromCharCode(Math.floor(Math.random() * 26) + 'a'.charCodeAt(0));
        }
        return str;
    },
    errorLog: function (log) {
        throw new Error(log);
    }
};


var hashids = new Hashids(util.getRandomStr(), 4);

/**
 * 混淆类
 * @param {[type]} opts [description]
 */
var Mix = function (opts){
    this.ignoreClasses = [];
    this.ignoreIds = [];
    this.mapCounter = -1;
    this.files = {};
    this.currentFile = null;
    this.map = {
        'id'    : {},
        'class' : {}
    };
    this.customMap = {
        'id': {},
        'class': {},
        'attr': {}
    };
    //自定义混淆器, 自定义混淆的处理函数
    this.mixer = {
        'js'   : [],
        'html' : [],
        'css'  : []
    };
    // 固定方式混淆
    this.customMix = {
        'name': [],
        'path': []
    };
    this.mixClass = [];
    this.mixClassReg = [];

    //初始化运行
    if (opts) {
        this.init(opts);
        this.run();
        this.afterMix();
    }
};

/**
 * 初始化参数
 * @param  {[type]} opts [description]
 * @return {[type]}      [description]
 */
Mix.prototype.init = function (opts) {
    var that = this;
    this.paramCheck();
    this.ignore = opts.ignore && opts.ignore.name || [];
    this.ignoreClassRegs = opts.ignore && opts.ignore.classReg || [];
    this.mixNameFun = opts.mixNameFun || null;
    this.jsPrefixs = opts.jsPrefixs || [];
    this.getProcessedResult = opts.getProcessedResult || null;
    this.pathKey = opts.pathKey;
    this.resource = opts.resource;
    // get the files should be process
    this.files = fileProcess.getAllFiles(opts.resource, opts.list, this.pathkey);
    typeof opts.getFileContent === 'function' && (fileUtil.getFileContent = opts.getFileContent);
    typeof opts.setFileContent === 'function' && (fileUtil.setFileContent = opts.setFileContent);
    // procee ignore
    util.map(this.ignore, function (id, ign) {
        ign = ign.replace(/\s/,'');
        if (ign.indexOf('.') === 0) { 
            that.ignoreClasses.push(ign.replace('.', ''));
        }
        if (ign.indexOf('#') === 0) {
            that.ignoreIds.push(ign.replace('#', ''));
        }
    });
    // process the class be mixed only
    if (opts.onlyMixClass && opts.onlyMixClass instanceof Array) {
        opts.onlyMixClass.forEach(function (onlyMixName) {
            if (onlyMixName instanceof RegExp) {
                that.mixClassReg.push(onlyMixName);
            }
            else if (typeof onlyMixName === 'string'){
                that.mixClass.push(onlyMixName);
            }
        });
    }
    // set the custom mix class or path
    if (opts.customMix) {
        util.map(this.customMix, function (key, value){
            var customMix = opts.customMix;
            if (customMix[key] != null && customMix[key] instanceof Array) {
                that.customMix[key] = customMix[key];
            }
        });
    }
    // set the custom mix function
    if (opts.mixer) {
        util.map(opts.mixer, function (type,mixers){
            mixers.forEach(function (mixer) {
                if (typeof mixer == 'function'){
                    that.addCustomMixer(type,mixer);
                }
            });
        });
    }
};

/**
 * do some params checking thing
 * @return {[type]} [description]
 */
Mix.prototype.paramCheck = function () {

};

/**
 * 执行混淆操作入口
 */
Mix.prototype.run = function () {
    this.parserFiles();
    this.mixFiles();
};

Mix.prototype.afterMix = function () {
    if (this.getProcessedResult != null && typeof this.getProcessedResult === 'function') {
        this.getProcessedResult.call(this, this.map, this.customMap);
    }
    // console.log(this.map);
    // console.log(this.files);
    // console.log(this.resource);
    // console.log(this.customMap);
};

/**
 * 添加自定义混淆
 * @param {[type]}   type [description]
 * @param {Function} cb   [description]
 */
Mix.prototype.addCustomMixer = function (type, cb) {
    if (typeof cb == 'function' && this.mixer[type]) {
        this.mixer[type].push(cb);
    }
};

/**
 * 解析组件内所有css的待混淆的选择器
 */
Mix.prototype.parserFiles = function (){
    var that = this;
    var files = that.files;
    files.forEach(function (fileKey) {
        if (that.resource[fileKey] != null) {
            var path = that.currentPath = fileKey;
            that.currentFile = that.resource[fileKey];
            if (fileUtil.getFileType(path).isCssLike) {
                that.parseCss(fileUtil.getFileContent(that.currentFile));
            } else if (fileUtil.getFileType(path).isHtmlLike) {
                that.parseCSSInHtml(fileUtil.getFileContent(that.currentFile));
            }
        }
    });
    // util.map(files, function (key, file) {
    //     that.currentFile = file;
    //     var path = that.pathkey != null ? file[that.pathkey] : key;
    //     if (fileUtil.getFileType(path).isCssLike) {
    //         that.parseCss(fileUtil.getFileContent(file));
    //     } else if (fileUtil.getFileType(path).isHtmlLike) {
    //         that.parseCSSInHtml(fileUtil.getFileContent(file));
    //     }
    // });
};


/**
 * 混淆指定文件
 */
Mix.prototype.mixFiles = function (){
    var that  = this;
    var files = that.files;
    files.forEach(function (fileKey) {
        if (that.resource[fileKey] != null) {
            var path = that.currentPath = fileKey;
            that.currentFile = that.resource[fileKey];
            if (fileUtil.getFileType(path).isCssLike) {
                that.mixCss(that.currentFile);
            } else if(fileUtil.getFileType(path).isHtmlLike) {
                that.mixHtml(that.currentFile);
            } else if(fileUtil.getFileType(path).isJsLike) {
                that.mixJs(that.currentFile);
            }
        }
    });
    // util.map(files, function (key, file) {
    //     var path = that.pathkey != null ? file[that.pathkey] : key;
    //     if (fileUtil.getFileType(path).isCssLike) {
    //         that.mixCss(file);
    //     } else if(fileUtil.getFileType(path).isHtmlLike) {
    //         that.mixHtml(file);
    //     } else if(fileUtil.getFileType(path).isJsLike) {
    //         that.mixJs(file);
    //     }
    // });
};

/**
 * 解析css文件
 * @param  {[type]}
 * @return {[type]}
 */
Mix.prototype.parseCss = function (css) {
    var that = this;
    var css = css_parser(css);
    var styles = this.styles || [];

    util.map(css.stylesheet.rules, function (i, style) {
        if (style.media) {
            styles = styles.concat(style.rules);
        }
        if (style.selectors) {
            styles.push(css.stylesheet.rules[i]);
        }
    });

    util.map(styles, function (o, style) {
        style.selectors.forEach(function (selector) {
            that.parseCssSelector(selector);
        });
    });

    this.styles = styles;
};

/**
 * 解析html/tpl文件中的css片段
 * @param  {[type]}
 * @return {[type]}
 */
Mix.prototype.parseCSSInHtml = function (html){
    //支持<style> <%style%> {%style%} 三种格式
    var re = /(<|{%|<%)style.*(%}|%>|>)([\s\S]*?)(<|{%|<%)\/style(%}|%>|>)/m;
    var match;
    var that = this;
    while (match = re.exec(html)) {
        that.parseCss(match[3]);
        html = html.replace(match[0], '');
    }
};

/**
 * parseCssSelector
 *
 * parse CSS strings to get their classes and ids
 *
 * @param css String the css string
 */
Mix.prototype.parseCssSelector = function (selector) {
    var that = this;
    var match = null;
    var tid = selector.match(/#[\w\-]+/gi);
    var tcl = selector.match(/\.[\w\-]+/gi);
    if (tid) {
        tid.forEach(function (match) {
            var id = match.replace('#', '');
            that.setMixStr(id, 'id');
        });
    }
    if (tcl) {
        tcl.forEach(function (match) {
            var cl = match.replace('.', '');
            that.setMixStr(cl, 'class');
        });
    }
};

/**
 * 混淆css
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixCss = function (file) {
    var content = this.getMixCssString(fileUtil.getFileContent(file));
    fileUtil.setFileContent(file, content);
};


/**
 * 混淆Js的选择器
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixJs = function (file) {
    var content = this.getMixJsString(fileUtil.getFileContent(file));
    fileUtil.setFileContent(file, content);
};

/**
 * 混淆Html
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixHtml = function (file) {
    var that = this;
    //混淆 js css 区块
    this.mixCssJsBlock(file);

    //混淆html中的样式选择器
    //只处理html中的id 和 class属性
    var html = fileUtil.getFileContent(file);
    var re = /\s+(id|class)\s*=\s*[\'"](.*?)[\'"]/gi;

    // custom parsers
    if (this.mixer.html.length > 0) {
        this.mixer.html.forEach(function (cb) {
            html = cb.call(that, html);
        });
    }

    var parseHtml = function (str, cls, mixedCls) {
        var parsedStr = '';
        var reg = new RegExp('[\"\'\\s]' + cls);
        str = str.replace(reg, function (a, b) {
            var otherStr = a.replace(cls, '');
            return otherStr + mixedCls;
        });
        return str;
    };

    html = html.replace(re, function (origin, type, selector){
        var splitd = selector.trim().split(/\s+/);
        var passed = origin;
        util.map(splitd, function (i, cls) {
            if (that.map[type][cls]){
                passed = parseHtml(passed, cls, that.map[type][cls]);
            }
            else if (!that.isIgnored(cls)) {
                passed = parseHtml(passed, cls, that.setMixStr(cls, type));
            }
        });
        return passed;
    });
    fileUtil.setFileContent(file, html);
};

/**
 * 混淆html页面中的css和js区块
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
Mix.prototype.mixCssJsBlock = function (file){
    var re = /(<|{%|<%)(style|script).*(%}|%>|>)([\s\S]*?)(<|{%|<%)\/(style|script)(%}|%>|>)/m;
    var match;
    var that = this;
    var html = fileUtil.getFileContent(file);
    var codes = {};
    var count = 0;
    while (match = re.exec(html)) {
        count++;
        var type = match[2].trim();
        var innerCode = match[4];
        var text = type == 'style' ? that.getMixCssString(innerCode)
                        : that.getMixJsString(innerCode);
        var flag = 'mix_html_content_' + type + '_' + count;
        html = html.replace(match[0],"<!--"+ flag +"-->");
        codes[flag] = match[0].replace(innerCode,text);
    }

    util.map(codes,function (flag,code){
        html = html.replace("<!--" + flag + "-->",code);
    });
    fileUtil.setFileContent(file, html);
};

/**
 * 根据map表计算混淆后的样式
 * @param  {[type]} css [description]
 * @return {[type]}     [description]
 */
Mix.prototype.getMixCssString = function (css) {
    var that = this;
    var text = css;
    var styles = this.styles;
    css = css_parser(text);
    // custom parsers
    if (this.mixer.css.length > 0) {
        this.mixer.css.forEach(function (cb) {
            text = cb.call(that, text);
        });
    }

    util.map(styles, function (u, style) {
        style.selectors.forEach(function (selector) {
            var original = selector;
            var tid = selector.match(/#[\w\-]+/gi);
            var tcl = selector.match(/\.[\w\-]+/gi);

            if (tid) {
                util.map(tid, function (i, match) {
                    match = match.replace('#', '');
                    if (that.map["id"][match]) {
                        selector = selector.replace(new RegExp("#" + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.map["id"][match]);
                    }
                });
            }
            if (tcl) {
                var countList = {};
                util.map(tcl, function (o, match) {
                    match = match.replace('.', '');
                    if (that.map["class"][match]) {
                        selector = selector.replace(new RegExp("\\." + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "i"), '.' + that.map["class"][match]);
                    }
                });
            }

            text = text.replace(original, selector);
        });
    });

    return text;
};

/**
 * 获取混淆后的js代码
 * @param  {[type]} js [description]
 * @return {[type]}    [description]
 */
Mix.prototype.getMixJsString = function (js){
    var  that = this,
        match = null;

    // custom parsers
    if (this.mixer.js.length > 0) {
        this.mixer.js.forEach(function (cb) {
            js = cb.call(that, js);
        });
    }

    //js getElementsByClassName、getElementById
    var parser_1 = /(getElementsByClassName|getElementById)\(\s*[\'"](.*?)[\'"]/gi;
    while ((match = parser_1.exec(js)) !== null) {
        var type = match[1].indexOf("Class") > -1 ? "class" : "id";
        var name = match[2].trim();
        if(that.map[type][name]){
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.map[type][name]);
            js = js.replace(match[0], passed);
        }
        else if (!that.isIgnored(name)) {
            var passed = match[0].replace(new RegExp(match[2], "gi"), that.setMixStr(name, 'class'));
            js = js.replace(match[0], passed);
        }

    }

    //js setAttribute id class
    var parser_2 = /(setAttribute|attr)\(\s*[\'"](id|class)[\'"],\s*[\'"](.+?)[\'"]/gi;
    while ((match = parser_2.exec(js)) !== null) {
        var key = (match[2] == 'id') ? 'id': 'class';
        // var passed = match[0];
        var replacedStr = match[0];
        if (key == 'class') {
            var splitd = match[3].split(/\s+/);
            replacedStr = 'attr(\'class\', \'';
            util.map(splitd, function (i, cls) {
                if (cls.length === 0) {
                    replacedStr += ' ';
                    return;
                }
                if (that.map[key][cls]){
                    replacedStr += that.map[key][cls];
                }
                else if (!that.isIgnored(cls)) {
                    replacedStr += that.setMixStr(cls, 'class');
                }
                replacedStr += ' ';
            });
            replacedStr = replacedStr.slice(0, -1);
            replacedStr += '\'';
        }else if(that.ignoreIds.indexOf(match[3]) < 0 &&
            that.map[key][match[3]]){
            var replacedStr = 'attr(\'id\', \'' + that.map[key][match[3]] + '\'';
        }
        js = js.replace(match[0], replacedStr);
    }

    //jquery $("selector") 注意带.或#前缀
    // 适应find('.test img');   '.thumb[_src]'等写法
    var parser_3 =  /[\'"](([.#][^.#\[\]\'"]+?)+[^\'"]*?)[\'"]/gi;
    while ((match = parser_3.exec(js)) !== null) {
        //如果路径字符串不处理
        if(match[1].indexOf("/") > -1){
            continue;
        }
        var matchList = match[1].split(/\s+/);
        var passed = match[0];
        util.map(matchList, function (i, preMatchStr) {
            var subParser = /[.#]([^.#\[\]]+)/gi;
            if (subParser.test(preMatchStr)) {
                var matchStr = preMatchStr.match(subParser)[0];
                if (matchStr.length > 0 && matchStr.slice(1).length > 0) {
                    if (matchStr.indexOf('#') > -1) {
                        matchStr = matchStr.slice(1);
                        if (that.map.id[matchStr]) {
                            passed = passed.replace('#' + matchStr, '#' + that.map.id[matchStr]);
                        }
                    }
                    else if (matchStr.indexOf('.') > -1) {
                        matchStr = matchStr.slice(1);
                        if (that.map.class[matchStr]){
                            passed = passed.replace('.' + matchStr, '.' + that.map.class[matchStr]);
                        }
                        else if (!that.isIgnored(matchStr)) {
                            passed = passed.replace('.' + matchStr, '.' + that.setMixStr(matchStr, 'class'));
                        }
                    }
                }
            }
        });
        js = js.replace(match[0], passed);
    }

    //jquery add/remove class
    var parser_4 = /(addClass|removeClass|hasClass|toggleClass)\([\'"](.*?)[\'"]/gi;
    while ((match = parser_4.exec(js)) !== null) {
        var passed = match[0];
        var splitd = match[2].trim().split(/\s+/);
        util.map(splitd, function (i, cls) {
            if (that.map.class[cls]){
                passed = passed.replace(new RegExp(cls, "gi"), that.map.class[cls]);
            }
            else if (!that.isIgnored(cls)) {
                passed = passed.replace(new RegExp(cls, "gi"), that.setMixStr(cls, 'class'));
            }
        });
        js = js.replace(match[0], passed);
    }

    //tpl class － 但会影响子类的模块名功能
    var parser_5 = /class\=\"(.[^+\<\{]+?)\"/g;
    var matchList = js.match(parser_5);
    js = js.replace(parser_5, function (a, b) {
        var matchList = b.split(/\s+/);
        var replacedStr = 'class="';
        util.map(matchList, function (i, cls) {
            if (that.map.class[cls]){
                replacedStr += that.map.class[cls] + ' ';
            }
            else if (!that.isIgnored(cls)) {
                replacedStr += that.setMixStr(cls, 'class') + ' ';
            }
            else {
                replacedStr += cls + ' ';
            }
        });
        replacedStr = ' ' + replacedStr.trim() + '"';
        return replacedStr;
    });

    if (this.jsPrefixs.length > 0) {
        for (var i = 0; i < this.jsPrefixs.length; i++) {
            var reg = new RegExp('(' + this.jsPrefixs[i] + '.*?)[\'\"\\s]', 'g');
            js = js.replace(reg, function (a, b) {
                var otherStr = '';
                var replacedStr = '';
                var cls = b;
                if (new RegExp(b + '.+').test(a)) {
                    otherStr = a.replace(b, '');
                }
                if (that.map.class[cls]){
                    replacedStr += that.map.class[cls];
                }
                else if (!that.isIgnored(cls)) {
                    replacedStr += that.setMixStr(cls, 'class');
                }
                else {
                    replacedStr += cls;
                }
                replacedStr += otherStr;
                return replacedStr;
            });
        }
    }

    return js;
};

/**
 * 匹配用户设定的自定义混淆方法的元素
 * @param  {[type]} original [description]
 * @return {[type]}          [description]
 */
Mix.prototype.checkCustomMix = function (original) {
    var that = this;
    var customMix = this.customMix;
    var flag = false;
    util.map(customMix, function (key, mixArray) {
        if (key === 'name') {
            mixArray.forEach(function (mixName) {
                if (mixName instanceof RegExp) {
                    if (mixName.test(original)) {
                        flag = true;
                        return;
                    }
                }
                else if (typeof mixName === 'string'){
                    if (mixName === original) {
                        flag = true;
                    }
                }
            });
        }
        else if (key === 'path') {
            var path = that.currentPath;
            mixArray.forEach(function (mixRegorStr) {
                if (mixRegorStr instanceof RegExp) {
                    if (mixRegorStr.test(path)) {
                        flag = true;
                        return;
                    }
                } else if (typeof mixRegorStr === 'string'){
                    if (path.indexOf(mixRegorStr) > -1) {
                        flag = true;
                    }
                }
            });
        }
    });
    return flag;
};

/**
 * 对有特殊JS前缀的class做处理，此处为了做兼容
 * @param  {[type]} classname [description]
 * @return {[type]}           [description]
 */
Mix.prototype.processPrefix = function (original) {
    if (this.jsPrefixs.length > 0) {
        var matchPrefix;
        for (var i = 0; i < this.jsPrefixs.length; i++) {
            var reg = new RegExp('^' + this.jsPrefixs[i], 'g');
            if (reg.test(original)) {
                matchPrefix = this.jsPrefixs[i];
                break;
            }
        }
        if (matchPrefix != null) {
            return original.replace(matchPrefix, '');
        }
    }
    return original;
};

/**
 * 获取选择器混淆之后的名称
 * @param  {[type]} original [description]
 * @param  {[type]} type     [description]
 * @return {[type]}          [description]
 */
Mix.prototype.getMixStr = function (original, type) {
    if (type === 'id') {
        return this.map['id'][original];
    }
    else {
        // original = this.processPrefix(original);
        return this.map['class'][classname];
    }
};

/**
 * 对选择器进行混淆，并保存到全局变量中
 * @param {[type]} original [选择器]
 * @param {[type]} type     [类型class/id]
 */
Mix.prototype.setMixStr = function (original, type) {
    var that = this;
    // 判断名称是否可以被混淆，有指定只混淆某些，也有全部混淆
    var checkMix = function (original, type) {
        // 对id不做特殊处理
        if (type === 'id') {
            return true;
        }
        // 未设置mixClass，即未设置只处理哪些类
        if (that.mixClass.length === 0 && that.mixClassReg.length === 0) {
            return true;
        }
        // 设置了只对某些类名进行处理并且该class在list中
        else if (that.mixClass.length > 0) {
            if (that.mixClass.indexOf(original) > -1) {
                return true;
            }
            return false;
        }
        else if (that.mixClassReg.length > 0) {
            var flag = false;
            for (var i = 0; i < this.mixClassReg.length; i++) {
                if (this.mixClassReg[i].test(original)) {
                    flag = true;
                    break;
                }
            }
            return flag;
        }
        return false;
    };
    // 对有特殊JS前缀的做处理
    var prefixOriginal = this.processPrefix(original);
    if (checkMix(prefixOriginal, type)) {
        //忽略class
        if (!that.isIgnored(original, type) && !that.map[type][original]) {
            this.mapCounter++;
            var mixStr;
            var isCustom = false;
            // 以去掉前缀的className作为混淆的字符，为了做兼容
            // 即map['class']['JS-test'] === map['class']['test'],并都是以test为key去做md5
            if (original != null && typeof this.mixNameFun === 'function') {
                if (this.checkCustomMix(prefixOriginal)) {
                    mixStr = this.mixNameFun.call(this, prefixOriginal);
                    isCustom = true;
                }
            }
            mixStr = mixStr ? mixStr
                : (prefixOriginal != null && this.map[type][prefixOriginal] != null)
                    ? this.map[type][prefixOriginal] : util.getRandomStr(2) + hashids.encode(this.mapCounter);
            if (isCustom) {
                this.customMap[type][original] = mixStr;
            }
            this.map[type][original] = mixStr;
            return mixStr;
        }
        else if (that.map[type][original]) {
            return that.map[type][original];
        }
        return original;
    }
    return original;
};

/**
 * 判断选择器是否被设置为忽略
 * @param  {[type]}  name [description]
 * @param  {[type]}  type [class/id]
 * @return {Boolean}      [description]
 */
Mix.prototype.isIgnored = function (name, type) {
    if (type === 'id') {
        if (this.ignoreIds.indexOf(name) > -1) {
            return true;
        }
    }
    else {
        var ignoreClasses = this.ignoreClasses;
        var flag = false;
        if (ignoreClasses.indexOf(name) > -1) {
            return true;
        }
        for (var i = 0; i < this.ignoreClassRegs.length; i++) {
            if (this.ignoreClassRegs[i].test(name)) {
                flag = true;
                break;
            }
        }
        return flag;
    }
    return false;
};


module.exports  = Mix;
