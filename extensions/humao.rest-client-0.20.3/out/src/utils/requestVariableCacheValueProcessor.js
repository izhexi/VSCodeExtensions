"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpRequest_1 = require("../models/httpRequest");
const mimeUtility_1 = require("./mimeUtility");
const misc_1 = require("./misc");
const jp = require('jsonpath');
const xpath = require('xpath');
const { DOMParser } = require('xmldom');
const requestVariablePathRegex = /^(\w+)(?:\.(request|response)(?:\.(body|headers)(?:\.(.*))?)?)?$/;
class RequestVariableCacheValueProcessor {
    static resolveRequestVariable(value, path) {
        if (!value || !path) {
            return { state: 2 /* Error */, message: "Request variable path is not provided" /* NoRequestVariablePath */ };
        }
        const matches = path.match(requestVariablePathRegex);
        if (!matches) {
            return { state: 2 /* Error */, message: "Incorrect request variable reference syntax, it should be \"variableName.(response|request).(headers|body).(headerName|JSONPath|XPath|*)\"" /* InvalidRequestVariableReference */ };
        }
        const [, , type, httpPart, nameOrPath] = matches;
        if (!type) {
            return { state: 1 /* Warning */, value, message: "Http entity name \"response\" or \"request\" should be provided right after the request variable name" /* MissingRequestEntityName */ };
        }
        const httpEntity = value[type];
        if (!httpPart) {
            return { state: 1 /* Warning */, value: httpEntity, message: "Http entity part \"headers\" or \"body\" should be provided right after the http entity name" /* MissingRequestEntityPart */ };
        }
        return RequestVariableCacheValueProcessor.resolveHttpPart(httpEntity, httpPart, nameOrPath);
    }
    static resolveHttpPart(http, httpPart, nameOrPath) {
        if (httpPart === "body") {
            const { body, headers } = http;
            if (!body) {
                const message = http instanceof httpRequest_1.HttpRequest ? "Request body of given request doesn't exist" /* RequestBodyNotExist */ : "Response body of given request doesn't exist" /* ResponseBodyNotExist */;
                return { state: 1 /* Warning */, message };
            }
            if (!nameOrPath) {
                return { state: 1 /* Warning */, value: body, message: "Body path should be provided right after \"body\"" /* MissingBodyPath */ };
            }
            // Make '*' as the wildcard to fetch the whole body regardless of the content-type
            if (nameOrPath === '*') {
                return { state: 0 /* Success */, value: body };
            }
            const contentTypeHeader = misc_1.getHeader(headers, 'content-type');
            if (mimeUtility_1.MimeUtility.isJSON(contentTypeHeader)) {
                const parsedBody = JSON.parse(body);
                return RequestVariableCacheValueProcessor.resolveJsonHttpBody(parsedBody, nameOrPath);
            }
            else if (mimeUtility_1.MimeUtility.isXml(contentTypeHeader)) {
                return RequestVariableCacheValueProcessor.resolveXmlHttpBody(body, nameOrPath);
            }
            else {
                return { state: 1 /* Warning */, value: body, message: "Only JSON response/request body is supported to query the result" /* UnsupportedBodyContentType */ };
            }
        }
        else {
            const { headers } = http;
            if (!nameOrPath) {
                return { state: 1 /* Warning */, value: headers, message: "Header name should be provided right after \"headers\"" /* MissingHeaderName */ };
            }
            const value = misc_1.getHeader(headers, nameOrPath);
            if (!value) {
                return { state: 1 /* Warning */, message: "No value is resolved for given header name" /* IncorrectHeaderName */ };
            }
            else {
                return { state: 0 /* Success */, value };
            }
        }
    }
    static resolveJsonHttpBody(body, path) {
        try {
            const result = jp.query(body, path);
            const value = typeof result[0] === 'string' ? result[0] : JSON.stringify(result[0]);
            if (!value) {
                return { state: 1 /* Warning */, message: "No value is resolved for given JSONPath" /* IncorrectJSONPath */ };
            }
            else {
                return { state: 0 /* Success */, value };
            }
        }
        catch (_a) {
            return { state: 1 /* Warning */, message: "Invalid JSONPath query" /* InvalidJSONPath */ };
        }
    }
    static resolveXmlHttpBody(body, path) {
        try {
            const doc = new DOMParser().parseFromString(body);
            const results = xpath.select(path, doc);
            if (typeof results === 'string') {
                return { state: 0 /* Success */, value: results };
            }
            else {
                if (results.length === 0) {
                    return { state: 1 /* Warning */, message: "No value is resolved for given XPath" /* IncorrectXPath */ };
                }
                else {
                    const result = results[0];
                    if (result.nodeType === 9 /* Document */) {
                        // Document
                        return { state: 0 /* Success */, value: result.documentElement.toString() };
                    }
                    else if (result.nodeType === 1 /* Element */) {
                        // Element
                        return { state: 0 /* Success */, value: result.childNodes.toString() };
                    }
                    else {
                        // Attribute
                        return { state: 0 /* Success */, value: result.nodeValue };
                    }
                }
            }
        }
        catch (_a) {
            return { state: 1 /* Warning */, message: "Invalid XPath query" /* InvalidXPath */ };
        }
    }
}
exports.RequestVariableCacheValueProcessor = RequestVariableCacheValueProcessor;
//# sourceMappingURL=requestVariableCacheValueProcessor.js.map