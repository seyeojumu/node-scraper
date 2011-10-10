var htmlparser = require('htmlparser'),
    inherits = require('util').inherits,
    htmlfind = require('./htmlfind'),
    select = require('./soupselect').select,
    ElementType = htmlparser.ElementType;

function ParserHandler(callback, options) {
    htmlparser.DefaultHandler.call(this, callback, options);
}
inherits(ParserHandler, htmlparser.DefaultHandler);

ParserHandler.prototype.handleElement = function(element) {
    element.parent = this._tagStack.last();
    if (element.parent) {
        element.index = element.parent.children ? element.parent.children.length : 0;
    }
    htmlparser.DefaultHandler.prototype.handleElement.call(this, element);
}

function isDomTag(e) {
    return e === 'object' && e.type === 'tag';
}

var Document = function(html) {
    var handler = new ParserHandler();
    var parser = new htmlparser.Parser(handler);
    parser.parseChunk(html);

    this._dom = handler.dom;
}
Document.prototype.selector = function() {
    var self = this;
    return function(selector) {
        if (typeof selector === 'string') {
            return new Selector(select(self._dom, selector));        
        }
        else if (isDomTag(selector)) {
            return new Selector(selector);
        }
        else if (Array.isArray(selector) && (!selector.length || isDomTag(selector[0]))) {
            return new Selector(selector);
        }
    }
}

var Selector = function(elementList) {
    if (!Array.isArray(elementList)) {
        elementList = [elementList];
    }
    this._list = elementList;   
}
Selector.prototype.each = function(callback) {
    this._list.forEach(callback);
}
Selector.prototype.find = function(selector) {
    var self = this,
        list = [];

    this.each(function(e) {
        list = list.concat(select(e.children, selector));
    })
    return new Selector(list);
}
Selector.prototype.children = function(selector) {
    var self = this,
        list = [];

    this.each(function(e) {
        list = list.concat(select(e.children, selector, true));
    })
    return new Selector(list);
}
Selector.prototype.text = function(delim) {
    var parts = this._list.map(function(e) { return htmlfind.text(e); });
    return parts.join(delim);
}

function selectorFor(html) {
    var doc = new Document(html);
    return doc.selector();    
}

function test() {
    var html = '<html><body class="f2"><form id="f1"><input id="f1"><input class="f2" /><input class="f3" /><input class="f4" /></form><form class="f2"><input class="f2" /></form></body></html>';
    var doc = new Document(html);
    var $ = doc.selector();

    console.log($('*'));    
}

exports.selectorFor = selectorFor;