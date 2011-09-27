var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    querystring = require('querystring'),
    httpclient = require('lib/httpclient'),
    Request = require('./request').Request,
    Response = require('./response').Response;

var Scrape = function(scraper) {
    EventEmitter.call(this);
    this._scraper = scraper;
    this._client = new httpclient.HttpClient()
}
inherits(Scrape, EventEmitter);

Scrape.prototype.start = function(request) {
    var self = this,
        url = request.url,
        headers = request.headers,
        follow = request.followRedirects,
        data = request.data;

    if (data && typeof data != 'string')
        data = querystring.stringify(data);

    self._client.perform(url, data ? 'POST' : 'GET', data, headers, follow).then(function(httpResponse) {
        var response = new Response(httpResponse, request),
            parser = self._scraper.parserForUrl(request.url);

        parser.call(self, response);
    }, function(error) {
        self.emit('error', error);
    });        
}

Scrape.prototype.scrape = function(request) {
    return this._scraper.scrape(request);
}

Scrape.prototype.yieldItem = function(item) {
    this.emit('item', item);
}

Scrape.prototype.yieldRequest = function(request) {
    var self = this;
    process.nextTick(function() {
        self.start(new Request(request));
    })
}

var Scraper = function() {
    this._parsers = {};
    this._scrape = null;
}

Scraper.prototype.addParser = function(url, parser) {
    this._parsers[url] = parser;
}

Scraper.prototype.parserForUrl = function(url) {
    var parser = this._parsers[url];
    if (!parser) {
        throw new Error('No parser for url: ' + url);
    }
    return parser;
}

Scraper.prototype.scrape = function(request) {
    var scrape = new Scrape(this);
    process.nextTick(function() {
        scrape.start(new Request(request));    
    })
    return scrape;
}

function define(name, parsers) {
    var scraper = new Scraper();

    for (var url in parsers) {
        scraper.addParser(url, parsers[url]);    
    }

    return scraper;
}

exports.define = define;