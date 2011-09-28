var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    assert = require('assert');

var Parser = function(parserDefinition, scraper, args) {
    EventEmitter.call(this);

    this.parse = parserDefinition.parse;
    this.timeout = parserDefinition.timeout;
    this.id = parserDefinition.id;
    this.args = args;
    this._scraper = scraper;
}
inherits(Parser, EventEmitter);

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
   return this._scraper.scrape(request, args);
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
