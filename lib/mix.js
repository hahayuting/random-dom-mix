'use strict';

var fs = require('fs');
var pth = require('path');
var css_parser = require("css-parse");
var Hashids = require('hashids');

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
    getRandomStr: function (len, maxLen) {
        var str = '';
        // len不填默认为5, 有maxLen则取范围内的随机值
        if (len == null && typeof maxLen !== 'number') {
            len = 5;
        }
        else if (maxLen != null && typeof maxLen === 'number') {
            var min = Math.min(len, maxLen);
            var max = Math.max(len, maxLen) - min + 1;
            len = min + parseInt(Math.random() * max);
        }
        for (var i = 0; i < len; i++) {
            str+= String.fromCharCode(Math.floor(Math.random() * 26) + 'a'.charCodeAt(0));
        }
        return str;
    },
    errorLog: function (log) {
        throw new Error(log);
    }
};
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
        // 靠用户自定义传入，不自行读取
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
    },
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
        'class': {}
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
    this.jsPrefix = opts.jsPrefix || [];
    this.getProcessedResult = opts.getProcessedResult || null;
    this.pathKey = opts.pathKey;
    this.resource = opts.resource;
    // get the files should be process
    this.files = fileUtil.getAllFiles(opts.resource, opts.list, this.pathkey);
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
        util.map(that.customMix, function (key, value){
            var customMix = opts.customMix;
            if (customMix[key] != null && customMix[key] instanceof Array) {
                that.customMix[key] = customMix[key];
            }
        });
    }
    // set the attr to be mixed
    if (opts.mixAttr) {
        var mixAttr = [];
        if (typeof opts.mixAttr === 'string') {
            mixAttr.push(opts.mixAttr);
            that.map[opts.mixAttr] = {};
            that.customMap[opts.mixAttr] = {};
        }
        else if (opts.mixAttr instanceof Array) {
            mixAttr = opts.mixAttr;
            opts.mixAttr.forEach(function (mixAttrItem) {
                that.map[mixAttrItem] = {};
                that.customMap[mixAttrItem] = {};
            });
        }
        that.mixAttr = mixAttr;
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
    var styles = [];

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

Mix.prototype.getMixAttrReg = function () {
    if (this.mixAttr != null && this.mixAttr.length > 0) {
        var attrReg = '';
        this.mixAttr.forEach(function (attrItem) {
            attrReg += '|' + attrItem.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        });
        return attrReg;
    }
    return null;
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
    var mixAttrReg = that.getMixAttrReg();
    if (mixAttrReg != null) {
        re = new RegExp('\\s+(id|class' + mixAttrReg + ')\\s*=\\s*[\'"](.*?)[\'"]', 'g');
    }
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
            passed = parseHtml(passed, cls, that.setMixStr(cls, type));
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
    var styles = [];
    css = css_parser(text);

    util.map(css.stylesheet.rules, function (i, style) {
        if (style.media) {
            styles = styles.concat(style.rules);
        }
        if (style.selectors) {
            styles.push(css.stylesheet.rules[i]);
        }
    });

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
                    selector = selector.replace(new RegExp("#" + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "gi"), '#' + that.setMixStr(match, 'id'));
                });
            }
            if (tcl) {
                var countList = {};
                util.map(tcl, function (o, match) {
                    match = match.replace('.', '');
                    selector = selector.replace(new RegExp("\\." + match.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "i"), '.' + that.setMixStr(match, 'class'));
                });
            }
            text = text.replace(original, selector);
        });
    });

    return text;
};

Mix.prototype.resetLastIndex = function (reg, original, replacedStr) {
    var lastIndex = 0;
    if (typeof original === 'string' && typeof replacedStr === 'string') {
        var gap = replacedStr.length - original.length;
        lastIndex = reg.lastIndex + gap;
    }

    return lastIndex;
};

/**
 * 获取混淆后的js代码
 * @param  {[type]} js [description]
 * @return {[type]}    [description]
 */
Mix.prototype.getMixJsString = function (js){
    var that = this;
    var match = null;
    var mixAttrReg = that.getMixAttrReg();

    // custom parsers
    if (this.mixer.js.length > 0) {
        this.mixer.js.forEach(function (cb) {
            js = cb.call(that, js);
        });
    }

    //js getElementsByClassName、getElementById
    var parser_1 = /(getElementsByClassName|getElementById)\(\s*[\'"](.*?)[\'"]/g;
    while ((match = parser_1.exec(js)) !== null) {
        var type = match[1].indexOf('Class') > -1 ? 'class' : 'id';
        var name = match[2].trim();
        var replacedStr = match[0].replace(new RegExp(match[2]), that.setMixStr(name, type));
        js = js.replace(match[0], replacedStr);
        parser_1.lastIndex = that.resetLastIndex(parser_1, match[0], replacedStr);
    }

    //js setAttribute id class
    var parser_2 = /(setAttribute|attr)\(\s*[\'"](id|class)[\'"],\s*[\'"](.+?)[\'"]/g;
    if (mixAttrReg != null) {
        parser_2 = new RegExp('(setAttribute|attr)\\(\\s*[\'"](id|class' + mixAttrReg + ')[\'"],\\s*[\'"](.+?)[\'"]', 'g');
    }
    while ((match = parser_2.exec(js)) !== null) {
        var type = match[2];
        var replacedStr = match[0];
        var splitd = match[3].split(/\s+/);
        if (type === 'class') {
            var splitd = match[3].split(/\s+/);
            // 因为可能会有下面这种拼接情况，所以这样处理
            // eg: attr('class', 'moude-name' + className);
            replacedStr = 'attr(\'class\', \'';
            util.map(splitd, function (i, cls) {
                if (cls.length === 0) {
                    replacedStr += ' ';
                    return;
                }
                replacedStr += that.setMixStr(cls, 'class') + ' ';
            });
            replacedStr = replacedStr.slice(0, -1);
            replacedStr += '\'';
        } else if (type === 'id') {
            var mixedStr = that.setMixStr(match[3], type);
            replacedStr = 'attr(\'id\', \'' + mixedStr + '\'';
        } else if (that.mixAttr.indexOf(type) > -1) {
            var mixedStr = that.setMixStr(match[3], type);
            replacedStr = 'attr(\''+ type +'\', \'' + mixedStr + '\'';
        }
        js = js.replace(match[0], replacedStr);
        parser_2.lastIndex = that.resetLastIndex(parser_2, match[0], replacedStr);
    }

    //jquery $("selector") 注意带.或#前缀
    // 适应find('.test img');   '.thumb[_src]'等写法
    var parser_3 =  /[\'"](([.#][^.#\[\]\'"]+?)+[^\'"]*?)[\'"]/g;
    while ((match = parser_3.exec(js)) !== null) {
        //如果路径字符串不处理
        if(match[1].indexOf("/") > -1){
            continue;
        }
        var matchList = match[1].split(/\s+/);
        var replacedStr = match[0];
        util.map(matchList, function (i, preMatchStr) {
            var subParser = /[.#]([^.#\[\]]+)/gi;
            if (subParser.test(preMatchStr)) {
                var matchStr = preMatchStr.match(subParser)[0];
                if (matchStr.length > 0 && matchStr.slice(1).length > 0) {
                    if (matchStr.indexOf('#') > -1) {
                        matchStr = matchStr.slice(1);
                        replacedStr = replacedStr.replace('#' + matchStr, '#' + that.setMixStr(matchStr, 'id'));
                    }
                    else if (matchStr.indexOf('.') > -1) {
                        matchStr = matchStr.slice(1);
                        replacedStr = replacedStr.replace('.' + matchStr, '.' + that.setMixStr(matchStr, 'class'));
                    }
                }
            }
        });
        js = js.replace(match[0], replacedStr);
        parser_3.lastIndex = that.resetLastIndex(parser_3, match[0], replacedStr);
    }

    //jquery add/remove class
    var parser_4 = /(addClass|removeClass|hasClass|toggleClass)\([\'"](.*?)[\'"]/g;
    while ((match = parser_4.exec(js)) !== null) {
        var replacedStr = match[0];
        var splitd = match[2].trim().split(/\s+/);
        util.map(splitd, function (i, cls) {
            replacedStr = replacedStr.replace(new RegExp(cls, 'i'), that.setMixStr(cls, 'class'));
        });
        js = js.replace(match[0], replacedStr);
        parser_4.lastIndex = that.resetLastIndex(parser_4, match[0], replacedStr);
    }

    //tpl class － 但会影响子类的模块名功能
    // 用于匹配js中的模版片段 <div class="test">
    // 用于匹配js选择器中的写法.find(img[class~="test"]);
    var parser_5 = /(id|class)[!$~]{0,1}\=[\'\"]([^\'\"\+\<\{]+?)[\'\"]/g;
    if (mixAttrReg != null) {
        parser_5 = new RegExp('(id|class' + mixAttrReg + ')[!$~]{0,1}\\=[\'\"]([^\'\"\+\\<\\{]+?)[\'\"]', 'g');
    }
    while((match = parser_5.exec(js)) !== null) {
        var key = match[1];
        var replacedStr = match[0];
        var splitd = match[2].split(/\s+/);
        util.map(splitd, function (i, cls) {
            replacedStr = replacedStr.replace(new RegExp(cls, 'i'), that.setMixStr(cls, key));
        });
        js = js.replace(match[0], replacedStr);
        parser_5.lastIndex = that.resetLastIndex(parser_5, match[0], replacedStr);
    }

    // .find(img[class~=test]);
    var parser_6 = /\[(id|class)[!$~]{0,1}\=([^\'\"\+\<\{]+?)\]/g;
    if (mixAttrReg != null) {
        parser_6 = new RegExp('\\[(id|class' + mixAttrReg + ')[!$~]{0,1}\\=([^\'\"\+\\<\\{]+?)\\]', 'g');
    }
    while((match = parser_6.exec(js)) !== null) {
        var key = match[1];
        var replacedStr = match[0];
        var splitd = match[2].split(/\s+/);
        util.map(splitd, function (i, cls) {
            replacedStr = replacedStr.replace(new RegExp(cls, 'i'), that.setMixStr(cls, key));
        });
        js = js.replace(match[0], replacedStr);
        parser_6.lastIndex = that.resetLastIndex(parser_6, match[0], replacedStr);
    }

    // 匹配特殊的JS前缀
    if (this.jsPrefix.length > 0) {
        for (var i = 0; i < this.jsPrefix.length; i++) {
            var reg = new RegExp('(' + this.jsPrefix[i] + '.*?)[\'\"\\s]', 'g');
            js = js.replace(reg, function (a, cls) {
                var otherStr = '';
                if (new RegExp(cls + '.+').test(a)) {
                    otherStr = a.replace(cls, '');
                }
                var replacedStr = that.setMixStr(cls, 'class') + otherStr;
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
    if (this.jsPrefix.length > 0) {
        var matchPrefix;
        for (var i = 0; i < this.jsPrefix.length; i++) {
            var reg = new RegExp('^' + this.jsPrefix[i], 'g');
            if (reg.test(original)) {
                matchPrefix = this.jsPrefix[i];
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
    if (type === 'id' || type === 'class' || this.mixAttr.indexOf(type) > -1) {
        return this.map[type][original];
    }
    return null;
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
        else if (type === 'class') {
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
        }
        else if (that.mixAttr.indexOf(type) > -1) {
            return true;
        }
        return false;
    };
    // 对有特殊JS前缀的做处理
    var prefixOriginal = that.processPrefix(original);
    // 判断是否已经存在
    var mixedStr = that.getMixStr(original, type);
    if (mixedStr != null) {
        return mixedStr;
    }
    if (checkMix(prefixOriginal, type)) {
        // 判断class是否被放过
        if (!that.isIgnored(original, type)) {
            this.mapCounter++;
            var mixStr;
            // 判断是否是用户指定的要进行自定义混淆的字符
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
                    ? this.map[type][prefixOriginal] : util.getRandomStr(2, 4) + hashids.encode(this.mapCounter);
            if (isCustom) {
                this.customMap[type][original] = mixStr;
            }
            this.map[type][original] = mixStr;
            return mixStr;
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
    else if (type === 'class') {
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
