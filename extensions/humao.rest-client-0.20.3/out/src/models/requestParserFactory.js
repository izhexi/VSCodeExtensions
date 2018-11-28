"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const curlRequestParser_1 = require("../utils/curlRequestParser");
const httpRequestParser_1 = require("../utils/httpRequestParser");
class RequestParserFactory {
    createRequestParser(rawHttpRequest) {
        if (RequestParserFactory.curlRegex.test(rawHttpRequest)) {
            return new curlRequestParser_1.CurlRequestParser();
        }
        else {
            return new httpRequestParser_1.HttpRequestParser();
        }
    }
}
RequestParserFactory.curlRegex = /^\s*curl/i;
exports.RequestParserFactory = RequestParserFactory;
//# sourceMappingURL=requestParserFactory.js.map