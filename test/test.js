var scraper = require('..');

var parsers = {
    'http://www.google.com': {
        parse: function($) {
            var self = this,
                url = 'http://www.yahoo.com';

            this.request({url: 'http://aa.com'});
            this.request({url: 'http://www.yahoo.com'});
            this.scrape({url: url})
                .on('item', function(item) {
                    self.item({value: item});
                })
                .on('end', function() {
                    self.end(); 
                });
        }
    },
    
    'http://www.yahoo.com': {
        parse: function($) {
            var self = this;
            setTimeout(function() {
                self.item({yahoo: 1});        
                self.end();
            }, 2000);
        }
    }
};

var test = scraper.define('test scraper', parsers);

var scrape = test.scrape({
        url: 'http://aa.com'
    });

scrape
    .on('item', function(item) {
        console.log('got: ', item);
    })
    .on('end', function(item) {
        console.log('done! ');
    })

// test.debug(7000);
