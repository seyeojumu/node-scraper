var qs = require('querystring');

var express = null;

try {
    express = require('express');
}
catch (error) {
    console.log('Must install express to use the debugger!')
    console.log('Run: npm install express')
    process.exit(1);
}

var Debugger = function(scraperDefinition) {
    var self = this,
        app = this._app = express.createServer();

    app.configure(function(){
        app.set('views', __dirname + '/views');
    });

    app.get('/', function(req, res) {
        self._homeView(req, res);
    });

    app.get('/scraper/:key', function(req, res) {
        self._scraperView(req, res);
    });

    app.get('/parser/:index', function(req, res) {
        self._parserView(req, res);
    });

    this._scraperDef = scraperDefinition;
    this._scrapers = {};
    this._parsers = [];
    this._data = {};
}

Debugger.prototype.listen = function(port) {
    this._app.listen(port || 10000);
}

Debugger.prototype._homeView = function(req, res) {
    res.render('home.ejs', {scraperDef: this._scraperDef, esc: qs.escape});
}

Debugger.prototype._scraperView = function(req, res) {
    var self = this,
        key = req.param('key'),
        scraper = this._scrapers[key] = this._scraperDef.scrape({
            url: key
        }, req.query);

    scraper.on('parseEnded', function(parser) {
        parser._index = self._parsers.length;
        self._parsers.push(parser);
    })
    scraper.on('end', function() {
        res.render('scraper.ejs', {scraper: scraper, esc: qs.escape});         
    });
}

Debugger.prototype._parserView = function(req, res) {
    var index = +req.param('index'),
        parser = this._parsers[index];
    var html = parser.response.body;

    res.write(html);
    res.end();         
}

exports.Debugger = Debugger;