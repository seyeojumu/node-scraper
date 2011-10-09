var htmlparser = require('htmlparser'),
    inherits = require('util').inherits,
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

var Document = function(html) {
    var handler = new ParserHandler();
    var parser = new htmlparser.Parser(handler);
    parser.parseChunk(html);

    this._dom = handler.dom;
}
Document.prototype.selector = function() {
    var self = this;
    return function(selector) {
        return new Selector(select(self._dom, selector));
    }
}

var Selector = function(elementList) {
    if (!Array.isArray(elementList)) {
        throw new Error('Selector must be created from an element list');
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

var html = '<html><body class="f2"><form id="f1"><input id="f1"><input class="f2" /><input class="f3" /><input class="f4" /></form><form class="f2"><input class="f2" /></form></body></html>';
var doc = new Document(html);
var $ = doc.selector();

console.log($('*'));