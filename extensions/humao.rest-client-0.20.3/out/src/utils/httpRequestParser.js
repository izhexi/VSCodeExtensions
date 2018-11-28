"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const os_1 = require("os");
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const arrayUtility_1 = require("../common/arrayUtility");
const configurationSettings_1 = require("../models/configurationSettings");
const formParamEncodingStrategy_1 = require("../models/formParamEncodingStrategy");
const httpRequest_1 = require("../models/httpRequest");
const mimeUtility_1 = require("./mimeUtility");
const misc_1 = require("./misc");
const requestParserUtil_1 = require("./requestParserUtil");
const workspaceUtility_1 = require("./workspaceUtility");
const CombinedStream = require('combined-stream');
const encodeurl = require('encodeurl');
class HttpRequestParser {
    constructor() {
        this._restClientSettings = configurationSettings_1.RestClientSettings.Instance;
    }
    parseHttpRequest(requestRawText, requestAbsoluteFilePath) {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        let lines = requestRawText.split(os_1.EOL);
        // skip leading empty lines
        lines = arrayUtility_1.ArrayUtility.skipWhile(lines, value => value.trim() === '');
        // skip trailing empty lines
        lines = arrayUtility_1.ArrayUtility.skipWhile(lines.reverse(), value => value.trim() === '').reverse();
        if (lines.length === 0) {
            return null;
        }
        // parse request line
        let requestLine = HttpRequestParser.parseRequestLine(lines[0]);
        // get headers range
        let headers;
        let body;
        let bodyLines = [];
        let headerStartLine = arrayUtility_1.ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', 1);
        if (headerStartLine !== -1) {
            if (headerStartLine === 1) {
                // parse request headers
                let firstEmptyLine = arrayUtility_1.ArrayUtility.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let headerEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                let headerLines = lines.slice(headerStartLine, headerEndLine);
                let index = 0;
                let queryString = '';
                for (; index < headerLines.length;) {
                    let headerLine = (headerLines[index]).trim();
                    if (['?', '&'].includes(headerLine[0])) {
                        queryString += headerLine;
                        index++;
                        continue;
                    }
                    break;
                }
                if (queryString !== '') {
                    requestLine.url += queryString;
                }
                headers = requestParserUtil_1.RequestParserUtil.parseRequestHeaders(headerLines.slice(index));
                // get body range
                let bodyStartLine = arrayUtility_1.ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', headerEndLine);
                if (bodyStartLine !== -1) {
                    let contentTypeHeader = misc_1.getHeader(headers, 'content-type') || misc_1.getHeader(this._restClientSettings.defaultHeaders, 'content-type');
                    firstEmptyLine = arrayUtility_1.ArrayUtility.firstIndexOf(lines, value => value.trim() === '', bodyStartLine);
                    let bodyEndLine = mimeUtility_1.MimeUtility.isMultiPartFormData(contentTypeHeader) || firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                    bodyLines = lines.slice(bodyStartLine, bodyEndLine);
                }
            }
            else {
                // parse body, since no headers provided
                let firstEmptyLine = arrayUtility_1.ArrayUtility.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let bodyEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                bodyLines = lines.slice(headerStartLine, bodyEndLine);
            }
        }
        // if Host header provided and url is relative path, change to absolute url
        let host = misc_1.getHeader(headers, 'Host') || misc_1.getHeader(this._restClientSettings.defaultHeaders, 'host');
        if (host && requestLine.url[0] === '/') {
            let [, port] = host.split(':');
            let scheme = port === '443' || port === '8443' ? 'https' : 'http';
            requestLine.url = `${scheme}://${host}${requestLine.url}`;
        }
        // parse body
        let contentTypeHeader = misc_1.getHeader(headers, 'content-type') || misc_1.getHeader(this._restClientSettings.defaultHeaders, 'content-type');
        body = HttpRequestParser.parseRequestBody(bodyLines, requestAbsoluteFilePath, contentTypeHeader);
        if (this._restClientSettings.formParamEncodingStrategy !== formParamEncodingStrategy_1.FormParamEncodingStrategy.Never && body && typeof body === 'string' && mimeUtility_1.MimeUtility.isFormUrlEncoded(contentTypeHeader)) {
            if (this._restClientSettings.formParamEncodingStrategy === formParamEncodingStrategy_1.FormParamEncodingStrategy.Always) {
                const stringPairs = body.split('&');
                const encodedStringParis = [];
                for (const stringPair of stringPairs) {
                    const [name, ...values] = stringPair.split('=');
                    let value = values.join('=');
                    encodedStringParis.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
                }
                body = encodedStringParis.join('&');
            }
            else {
                body = encodeurl(body);
            }
        }
        return new httpRequest_1.HttpRequest(requestLine.method, requestLine.url, headers, body, bodyLines.join(os_1.EOL));
    }
    static parseRequestLine(line) {
        // Request-Line = Method SP Request-URI SP HTTP-Version CRLF
        let words = line.split(' ').filter(Boolean);
        let method;
        let url;
        if (words.length === 1) {
            // Only provides request url
            method = HttpRequestParser.defaultMethod;
            url = words[0];
        }
        else {
            // Provides both request method and url
            method = words.shift();
            url = line.trim().substring(method.length).trim();
            let match = words[words.length - 1].match(/HTTP\/.*/gi);
            if (match) {
                url = url.substring(0, url.lastIndexOf(words[words.length - 1])).trim();
            }
        }
        return {
            method: method,
            url: url
        };
    }
    static parseRequestBody(lines, requestFileAbsolutePath, contentTypeHeader) {
        if (!lines || lines.length === 0) {
            return null;
        }
        // Check if needed to upload file
        if (lines.every(line => !HttpRequestParser.uploadFromFileSyntax.test(line))) {
            if (!mimeUtility_1.MimeUtility.isFormUrlEncoded(contentTypeHeader)) {
                return lines.join(os_1.EOL);
            }
            else {
                return lines.reduce((p, c, i) => {
                    p += `${(i === 0 || c.startsWith('&') ? '' : os_1.EOL)}${c}`;
                    return p;
                }, '');
            }
        }
        else {
            let combinedStream = CombinedStream.create({ maxDataSize: 10 * 1024 * 1024 });
            for (const [index, line] of lines.entries()) {
                if (HttpRequestParser.uploadFromFileSyntax.test(line)) {
                    let groups = HttpRequestParser.uploadFromFileSyntax.exec(line);
                    if (groups !== null && groups.length === 2) {
                        let fileUploadPath = groups[1];
                        let fileAbsolutePath = HttpRequestParser.resolveFilePath(fileUploadPath, requestFileAbsolutePath);
                        if (fileAbsolutePath && fs.existsSync(fileAbsolutePath)) {
                            combinedStream.append(fs.createReadStream(fileAbsolutePath));
                        }
                        else {
                            combinedStream.append(line);
                        }
                    }
                }
                else {
                    combinedStream.append(line);
                }
                if (index !== lines.length - 1) {
                    combinedStream.append(HttpRequestParser.getLineEnding(contentTypeHeader));
                }
            }
            return combinedStream;
        }
    }
    static getLineEnding(contentTypeHeader) {
        return mimeUtility_1.MimeUtility.isMultiPartFormData(contentTypeHeader) ? '\r\n' : os_1.EOL;
    }
    static resolveFilePath(refPath, httpFilePath) {
        if (path.isAbsolute(refPath)) {
            return fs.existsSync(refPath) ? refPath : null;
        }
        let absolutePath;
        let rootPath = workspaceUtility_1.getWorkspaceRootPath();
        if (rootPath) {
            absolutePath = path.join(vscode_1.Uri.parse(rootPath).fsPath, refPath);
            if (fs.existsSync(absolutePath)) {
                return absolutePath;
            }
        }
        absolutePath = path.join(path.dirname(httpFilePath), refPath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
        return null;
    }
}
HttpRequestParser.defaultMethod = 'GET';
HttpRequestParser.uploadFromFileSyntax = /^<\s+([\S]*)\s*$/;
exports.HttpRequestParser = HttpRequestParser;
//# sourceMappingURL=httpRequestParser.js.map