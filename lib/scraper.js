var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    assert = require('assert'),
    querystring = require('querystring'),
    httpclient = require('lib/httpclient'),
    Request = require('./request').Request,
    Response = require('./response').Response;

var Parser = function(parserDefinition, scraper) {
    EventEmitter.call(this);

    this.parse = parserDefinition.parse;
    this.timeout = parserDefinition.timeout;
    this.id = parserDefinition.id;
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

Parser.prototype.scrape = function(request) {
   return this._scraper.scrape(request);
}


var ParserDefinition = function(id, definition) {
    var match, parse,
        args = {},
        timeout = 30000;

    if (typeof definition === 'function') {
        match = id;
        parse = definition;
    }
    else {
        match = definition.match;
        parse = definition.parse;
        args = definition.args;
        timeout = definition.timeout;
    }

    assert.ok(match, 'No matcher defined for parser: ' + id);
    assert.ok(typeof parse === 'function', 'No parsing function defined for parser: ' + id);

    this._match = match;
    this._args = args;
    this.timeout = timeout;
    this.id = id;
    this.parse = parse;
}

ParserDefinition.prototype.matches = function(request) {
    return this._match == request.url;
}

var Scraper = function(scraperDefinition) {
    EventEmitter.call(this);
    this._definition = scraperDefinition;
    this._client = new httpclient.HttpClient();
    this._activeParsers = 0;
}
inherits(Scraper, EventEmitter);

Scraper.prototype.parserForRequest = function(request) {
    var def = this._definition.parserDefinitionForRequest(request);
    return new Parser(def, this);
}

Scraper.prototype.start = function(request) {
    var self = this,
        url = request.url,
        headers = request.headers,
        follow = request.followRedirects,
        data = request.data,
        parser = self.parserForRequest(request);

    if (data && typeof data != 'string')
        data = querystring.stringify(data);

    self.parserStarted(parser);

    process.nextTick(function() {
        self._client.perform(url, data ? 'POST' : 'GET', data, headers, follow).then(function(httpResponse) {
            var response = new Response(httpResponse, request),
                items = [];

            parser.timeoutRef = setTimeout(function() {
                parser.removeAllListeners('item');
                parser.removeAllListeners('end');
                parser.removeAllListeners('request');
                self.emit('timeout', parser);
                self.parserEnded(parser);
            }, parser.timeout);

            parser.on('item', function(item) {
                items.push(item);
                self.emit('item', item);
            });
            parser.on('end', function() {
                self.parserEnded(parser);
            });
            parser.on('request', function(request) {
                self.start(new Request(request));                    
            })

            var results = parser.parse(response);

            if (results) {
                for (var i=0, result; result = results[i]; i++) {
                    if (result instanceof Request) {
                        self.start(new Request(result));
                    }
                    else {
                        self.emit('item', result);                    
                    }
                }
                self.parserEnded(parser);
            }
        }, function(error) {
            self.emit('error', error);
        });        
    });
}

Scraper.prototype.parserStarted = function(parser) {
    this._activeParsers++;
}

Scraper.prototype.parserEnded = function(parser) {
    if (parser && parser.timeoutRef) {
        clearTimeout(parser.timeoutRef);
        delete parser.timeoutRef;
    }
    if (!--this._activeParsers) {
        this.emit('end');
    }
}

Scraper.prototype.scrape = function(request) {
   return this._definition.scrape(request);
}

var ScraperDefinition = function(name, parserDefinitions) {
    this._parserDefs = [];
    this._name = name;

    for (var id in parserDefinitions) {
        this.addParser(id, parserDefinitions[id]);    
    }
}

ScraperDefinition.prototype.addParser = function(id, definition) {
    this._parserDefs.push(new ParserDefinition(id, definition));
}

ScraperDefinition.prototype.parserDefinitionForRequest = function(request) {
    for (var i=0, def; def = this._parserDefs[i]; i++) {
        if (def.matches(request)) {
            return def;
        }        
    }

    throw new Error('No parser defined for request: ' + request.url);
}

ScraperDefinition.prototype.scrape = function(request) {
    var scraper = new Scraper(this);
    scraper.start(new Request(request));    
    return scraper;
}

function define(name, parsers) {
    return new ScraperDefinition(name, parsers);
}

exports.define = define;