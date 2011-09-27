var scraper = require('..');

var parsers = {
    'http://www.google.com': function(response) {
        var self = this;
        this.item({google: response.request.meta.offset});
    	this.scrape({url: 'http://www.yahoo.com'})
    	    .on('item', function(item) {
                self.item({value: item});
            })
            .on('timeout', function(parser) {
                console.log('timeout: ', parser.id);
            })
            .on('end', function() {
                self.end(); 
            });
    },

    'yahoo': {
        timeout: 10,
        match: 'http://www.yahoo.com',
        parse: function(response) {
            var self = this;
            this.request({url: 'http://web.mit.edu'});
            setTimeout(function() {
                self.item({yahoo: 1});        
                self.end();
            }, 2000);
        }
    },

    'http://web.mit.edu': function(response) {
        return [{mit: 1}, {mit: 2}];
    }
};

var test = scraper.define('test scraper', parsers);

var scrape = test.scrape({
    url: 'http://www.google.com',
    meta: {
        offset: 7,
        name: 'test'
    }});

scrape
    .on('item', function(item) {
        console.log('got: ', item);
    })
    .on('end', function(item) {
        console.log('done! ');
    })
