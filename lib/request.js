var Request = function(options) {
    this.url = options.url;
    this.data = options.data;
    this.headers = options.headers;
    this.meta = options.meta;
    this.followRedirects = options.followRedirects;
}

exports.Request = Request;