var scraper = require('..');

var parsers = {
    'http://www.google.com': {
        parse: function(response) {
            var self = this;
            this.item({google: self.args.x});
            this.scrape({url: 'http://www.yahoo.com'})
                .on('item', function(item) {
                    self.item({value: item});
                })
                .on('end', function() {
                    self.end(); 
                });
        }
    },
    'http://www.yahoo.com': {
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

// var scrape = test.scrape({
//         url: 'http://www.google.com'
//     }, {
//         x: 17
//     });

// scrape
//     .on('item', function(item) {
//         console.log('got: ', item);
//     })
//     .on('end', function(item) {
//         console.log('done! ');
//     })

test.debug(7000);