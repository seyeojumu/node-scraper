var EventEmitter = require('events').EventEmitter,
    select = require('./select'),
    inherits = require('util').inherits,
    assert = require('assert');

var Parser = function(parserDefinition, scraper, args) {
    EventEmitter.call(this);

    this._parse = parserDefinition.parse;
    this._scraper = scraper;

    this.scrapers = []
    this.timeout = parserDefinition.timeout;
    this.id = parserDefinition.id;
    this.args = args;
}
inherits(Parser, EventEmitter);

Parser.prototype.parse = function(response) {
    this.response = response;
    var $ = select.selectorFor(response.body);
    return this._parse($, response);
}

Parser.prototype.item = function(item) {
    this.emit('item', item);
}

Parser.prototype.request = function(request) {
    this.emit('request', request);
}

Parser.prototype.end = function() {
    this.emit('end');
}

Parser.prototype.scrape = function(request, args) {
    var self = this,
        scraper = this._scraper.scrape(request, args);

    scraper.setParentParser(this);
    scraper.on('parseStarted', function(parser) {
        self._scraper.parserStarted(parser);   
    })
    scraper.on('parseEnded', function(parser) {
        self._scraper.parserEnded(parser);   
    })
    this.scrapers.push(scraper);
    return scraper;
}

Parser.prototype._historyHelper = function(history) {
    var parent = this._scraper.getParentParser();
    if (parent) {
        history.unshift(parent);
        parent._historyHelper(history)
    }
}

Parser.prototype.getHistory = function() {
    var history = [];
    this._historyHelper(history);
    return history;
}

var ParserDefinition = function(id, definition) {
    if (typeof definition === 'function') {
        definition = {
            parse: definition
        }
    }

    this._match = definition.match || id;
    this.id = id;
    this.args = definition.args || {};
    this.timeout = definition.timeout || 30000;
    this.parse = definition.parse;

    assert.ok(this._match, 'No matcher defined for parser: ' + id);
    assert.ok(typeof this.parse === 'function', 'No parsing function defined for parser: ' + id);
}

ParserDefinition.prototype.matches = function(request) {
    return this._match == request.url;
}

exports.Parser = Parser;
exports.ParserDefinition = ParserDefinition;
