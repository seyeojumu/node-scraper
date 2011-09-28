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
        self.homeView(req, res);
    });

    this._scraperDef = scraperDefinition;
}

Debugger.prototype.listen = function(port) {
    this._app.listen(port || 10000);
}

Debugger.prototype.homeView = function(req, res) {
    res.render('home.ejs', {scraperDef: this._scraperDef})
}


exports.Debugger = Debugger;