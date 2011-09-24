var s = scraper.define({
    'http://www.google.com': function(response) {
        this.request({url: 'www.yahoo.com'});
        this.item({foo: 'bar'});
    },

    'http://www.yahoo.com': function(response) {
        this.request({url: 'www.yahoo.com'});
        this.item({foo: 'bar'});
    }
})

s.on('item', function(item) {
    console.log('got: ', item);
})

s.scrape()