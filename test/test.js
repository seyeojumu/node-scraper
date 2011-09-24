var scraper = require('..'),
    util = require('util');

var MyScraper = function() {
    scraper.Scraper.call(this);
}
util.inherits(MyScraper, scraper.Scraper);

MyScraper.prototype.parse = function(response) {
    if (response.request.url == 'http://www.google.com') {
        this.emit('request', new scraper.Request({
            url: 'http://www.yahoo.com'
        }));        
        this.emit('request', new scraper.Request({
            url: 'http://www.yahoo.com'
        }));        
        this.emit('item', {foo:'bar'});         
    }
    else {
        this.emit('item', {x:1});         
    }
}

var myScraper = new MyScraper()

myScraper.on('item', function(item) {
    console.log('got: ', item);
})

myScraper.on('error', function(error) {
    console.log('error: ', error.stack);
})

myScraper.scrape(new scraper.Request({
    url: 'http://www.google.com'
}));
