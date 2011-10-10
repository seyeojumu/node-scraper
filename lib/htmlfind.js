var sys = require('sys'),
    htmlparser = require('htmlparser'),
    lang = require('lib/lang'),
    runtimeOptions = {};

/**
 * runtime options
 * - saveParent: stashes a parent attribute on every element that is returned from find
 */


Document = function (html) {
    var handler = new htmlparser.DefaultHandler()
    var parser = new htmlparser.Parser(handler)
    parser.parseChunk(html)
        
    this.type = 'document'
    this.name =  'root'
    this.children = handler.dom
}

/* 
 * in certain circumstances, we want to ignore the text that are in tags. for example, we may want to ignore superscripts
 * ignore is a list of tags to ignore.
 */
function text(e, ignore) {
    ignore = ignore || [];
    if (e.type == 'text') {
        return e.raw.trim()
    } 
    else if (e.type == 'tag' && (ignore.indexOf(e.name) === -1)) {
        var str = []
        
        var children = e.children
        if (children == undefined)
            return ''
            
        for (var i=0, len=children.length; i<len; i++) {
            str.push(text(children[i], ignore))
        }
        
        return str.join('')
    }
    
    return ''
}

function toString(e, level) {
    level = level || 0
    var indent = "    ".times(level)
    var str = []
    switch (e.type) {
        case 'tag':
            var attr = ""
            for (var a in e.attribs) {
                attr += ' '+a+'="'+e.attribs[a]+'"'
            }
//            str += indent + "<" + e.name + attr+">\n"
            str.push(indent + "<" + e.raw + ">\n")
            level++
            break
        case 'text':
            var text = e.data.trim()
            if (text && text.length > 0) str.push(indent + e.data.trim() + "\n")
            break
        case 'comment':
            str.push(indent + "<!-- " + e.data.trim() + " -->\n")
            break
        default: 
            str.push(indent + "["+e.type+","+sys.inspect(e)+"]")
            break
    }
    if (e.children) {
        var children = e.children
        for (var i=0, len=children.length; i<len; i++) {
            str.push(toString(children[i], level))
        }
    }
    switch (e.type) {
        case 'tag':
            str.push(indent + "</" + e.name + ">\n")
            break
        default: break
    }    
    
    return str.join('')
}

function matchValue(query, value) {
    if (query instanceof RegExp) {
        return (query.test(value))
    }
    else {
        return (query == value)
    }
}

function matchValues(query, values) {
    for (var i=0,len=values.length; i<len; i++) {
        if (matchValue(query, values[i])) return true
    }
    return false
}

function matchMultiAttrib(e, attrib, query) {
    if (!e.attribs || !e.attribs[attrib]) return false;
    var values = e.attribs[attrib].split(' ')
    if (query instanceof Array) {
        for (var i in query) {
            var q = query[i];
            if (matchValues(q, values)) return true
        }
        return false    
    }
    else
        return (matchValues(query, values))
}

function matchAttrib(e, attrib, query) {
    if (!e.attribs || !e.attribs[attrib]) return false;
    var value = e.attribs[attrib]
    if (query instanceof Array) {
        for (var i in query) {
            var q = query[i];
            if (matchValue(q, value)) return true
        }
        return false    
    }
    else
        return (matchValue(query, value))
}

function matchSpec(e, path, spec) {
    for (var key in spec) {
        if (key == 'tag') {
            if (e.type != 'tag' || e.name != spec.tag) return false
        }
        else if (key == 'class') {
            if (!matchMultiAttrib(e, 'class', spec.class)) return false            
        }
        else if (key == 'id') {
            if (!matchMultiAttrib(e, 'id', spec.id)) return false            
        }
        else if (key == 'path') {
            if (path != spec.path) return false
        }
        else if (key == 'text') {
            if (e.type != 'text' || !matchValue(spec.text, e.data)) return false
        }
        else {
            if (!matchAttrib(e, key, spec[key])) return false
        }
    }
    return true
}

function find(context, spec, results, path) {
    results = results || []
    if (context && context.children) {
        var children = context.children
        for (var i=0, len=children.length; i<len; i++) {
            var e = children[i]
            var step = e.name
            if (e.type == 'text') {
                step = 'text()'
            }
            var new_path = path ? path + '/' + step : step
            if (matchSpec(e, new_path, spec)) {
                if (runtimeOptions.saveParent) e.parent = context;
                results.push(e)                
            }
            find(e, spec, results, new_path)
        }
    }
    return results
}

function findFirstAfter(context, after, spec, results, path) {
    if (context.children == undefined)
        return null;

    var children = context.children;
    for (var i=children.indexOf(after)+1, e; e = children[i]; i++) {
        var step = (e.type == 'text') ? 'text()' : e.name
        var new_path = path ? path + '/' + step : step
        if (matchSpec(e, new_path, spec)) {
            if (runtimeOptions.saveParent) e.parent = context;
            return e;
        }
        var result = findFirst(e, spec, new_path)
        if (result) {
            return result;
        }
    }
    return null;
}


function findFirst(context, spec, path) {
    if (context.children == undefined)
        return null
    
    var children = context.children
    for (var i=0, e; e = children[i]; i++) {

        var step = (e.type == 'text') ? 'text()' : e.name
        var new_path = path ? path + '/' + step : step
        
        if (matchSpec(e, new_path, spec)) {
            if (runtimeOptions.saveParent) e.parent = context;
            return e;
        }
            
                            
        var result = findFirst(e, spec, new_path)
        if (result) {
            return result;
        }
    }
    return null
}

function findOne(context, spec, results) {
    var res = find(context, spec, results)
    if (!res) {
        throw new Error("findOne did not return any matches")        
    }
    else if (res.length === 0) {
        throw new Error('findOne returned zero matches');
    }
    else if (res.length > 1) {
        throw new Error("findOne returned more than one match")
    }
    else 
        return res[0]
}

exports.Document = Document
exports.find = find
exports.findOne = findOne
exports.findFirst = findFirst
exports.text = text
exports.toString = toString
exports.options = runtimeOptions;
exports.findFirstAfter = findFirstAfter;

function test() {
    var sys = require('sys')
    var doc = new Document("<html><body><p id='c1 c3'><span id='d2' class='d3'></span><span>test span</span></p><p id='c2'></p></body></html>")
    var results = find(doc, {'tag': 'p', 'id': /c/})
    sys.puts(sys.inspect(results))
    sys.puts(toString(doc))
}

if (process.argv[1] === __filename)
    test()
