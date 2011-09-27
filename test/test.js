var scraper = require('..');

var testScraper = {
    'http://www.google.com': function(response) {
        var self = this;
	this.scrape({url: 'http://www.yahoo.com'})
	    .on('item', function(item) {
	        self.yieldItem(item)            
	        self.yieldItem({foo: item.x + 1});
	    });
    },

    'http://www.yahoo.com': function(response) {
        this.yieldItem({x: 1});
    }
};

var test = scraper.define('test scraper', testScraper)

var s = test.scrape({url: 'http://www.google.com'});

s.on('item', function(item) {
    console.log('got: ', item);
})
