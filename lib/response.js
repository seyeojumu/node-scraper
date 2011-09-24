var Response = function(httpResponse, request) {
    this.request = request;
    this.statusCode = httpResponse.statusCode;
    this.headers = httpResponse.headers;
    this.body = httpResponse.body;
}

exports.Response = Response;