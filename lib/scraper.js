var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    assert = require('assert'),
    querystring = require('querystring'),
    httpclient = require('lib/httpclient'),
    Debugger = require('./debugger').Debugger,
    Parser = require('./parser').Parser,
    ParserDefinition = require('./parser').ParserDefinition,
    Request = require('./request').Request,
    Response = require('./response').Response;

var Scraper = function(scraperDefinition) {
    EventEmitter.call(this);
    this.name = scraperDefinition.name;
    this._definition = scraperDefinition;
    this._client = new httpclient.HttpClient();
    this._activeParsers = 0;
}
inherits(Scraper, EventEmitter);

Scraper.prototype.parserForRequest = function(request, args) {
    var def = this._definition.parserDefinitionForRequest(request);
    return new Parser(def, this, args);
}

Scraper.prototype.start = function(request, args) {
    var self = this,
        url = request.url,
        headers = request.headers,
        follow = request.followRedirects,
        data = request.data,
        parser = self.parserForRequest(request, args);

    if (data && typeof data != 'string')
        data = querystring.stringify(data);


    process.nextTick(function() {
        self.parserStarted(parser);
        self._client.perform(url, data ? 'POST' : 'GET', data, headers, follow).then(function(httpResponse) {
            var response = new Response(httpResponse, request);

            parser.items = [];

            parser.timeoutRef = setTimeout(function() {
                parser.removeAllListeners('item');
                parser.removeAllListeners('end');
                parser.removeAllListeners('request');
                self.emit('timeout', parser);
                self.parserEnded(parser);
            }, parser.timeout);

            parser.on('item', function(item) {
                parser.items.push(item);
                self.emit('item', item);
            });
            parser.on('end', function() {
                self.parserEnded(parser);
            });
            parser.on('request', function(request, args) {
                self.start(new Request(request), args);                    
            })

            var results = parser.parse(response);

            if (results) {
                for (var i=0, result; result = results[i]; i++) {
                    if (result instanceof Request) {
                        self.start(new Request(result));
                    }
                    else {
                        parser.items.push(result);
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
    if (this._debug) {
        console.log(parser.id + ': started')
    }
}

Scraper.prototype.parserEnded = function(parser) {
    if (parser && parser.timeoutRef) {
        clearTimeout(parser.timeoutRef);
        delete parser.timeoutRef;
    }
    if (!--this._activeParsers) {
        this.emit('end');
    }
    if (this._debug) {
        console.log(parser.id + ': ended ('+parser.items.length+' items found)')
    }
}

Scraper.prototype.scrape = function(request, args) {
    var scraper = this._definition.scrape(request, args);
    scraper.setOptions(this._options);
    return scraper;
}

Scraper.prototype.setOptions = function(options) {
    options = options || {};
    this._options = options;
    if (options.debug) this._debug = true;
}

var ScraperDefinition = function(name, parserDefinitions) {
    this._parserDefs = [];
    this.name = name;

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

ScraperDefinition.prototype.scrape = function(request, args) {
    var scraper = new Scraper(this);
    scraper.start(new Request(request), args);    
    return scraper;
}

ScraperDefinition.prototype.debug = function(port) {
    this.debugger = new Debugger(this);
    this.debugger.listen(port);
}

ScraperDefinition.prototype.getParserDefinitions = function() {
    return this._parserDefs;
}

function define(name, parsers) {
    return new ScraperDefinition(name, parsers);
}

exports.define = define;