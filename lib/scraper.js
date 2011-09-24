var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    querystring = require('querystring'),
    httpclient = require('lib/httpclient'),
    Request = require('./request').Request,
    Response = require('./response').Response;

var Scraper = function() {
    EventEmitter.call(this);
    this.items = [];
    this.active = 0;
}
inherits(Scraper, EventEmitter);

Scraper.prototype.parse = function(response) {
    throw new Error('Scraper must implement parse()')
}

Scraper.prototype.scrape = function(request) {
    this.client = new httpclient.HttpClient()
    this._start(request);
    this.done = false;
}

Scraper.prototype._start = function(request) {
    var self = this,
        url = request.url,
        headers = request.headers,
        follow = request.followRedirects,
        data = request.data;

    if (data && typeof data != 'string')
        data = querystring.stringify(data);

    self.active++;

    this.client.perform(url, data ? 'POST' : 'GET', data, headers, follow).then(function(httpResponse) {
        var response = new Response(httpResponse, request),
            scraper = request.scraper || self;

        self._watch(scraper);
        scraper.parse(response);
        if (!--self.active) self.emit('end');
    }, function(error) {
        self.emit('error', error);
        if (!--self.active) self.emit('end');
    });
}

Scraper.prototype._watch = function(scraper) {
    var self = this;

    scraper.on('request', function(request) {
        process.nextTick(function() {
            self._start(request);
        })
    })

    if (self != scraper) {
        scraper.on('item', function(item) {
            self.emit('item', item);
        })        
        scraper.on('error', function(error) {
            self.emit('error', error);
        })        
    }
}

exports.Request = Request;
exports.Scraper = Scraper;