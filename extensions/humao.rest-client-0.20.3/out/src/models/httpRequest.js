"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const misc_1 = require("../utils/misc");
class HttpRequest {
    constructor(method, url, headers, body, rawBody) {
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.body = body;
        this.rawBody = rawBody;
    }
    getHeader(name) {
        return misc_1.getHeader(this.headers, name);
    }
}
exports.HttpRequest = HttpRequest;
class SerializedHttpRequest {
    constructor(method, url, headers, body, startTime) {
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.body = body;
        this.startTime = startTime;
    }
    static convertFromHttpRequest(httpRequest, startTime = Date.now()) {
        return new SerializedHttpRequest(httpRequest.method, httpRequest.url, httpRequest.headers, httpRequest.rawBody, startTime);
    }
}
exports.SerializedHttpRequest = SerializedHttpRequest;
//# sourceMappingURL=httpRequest.js.map