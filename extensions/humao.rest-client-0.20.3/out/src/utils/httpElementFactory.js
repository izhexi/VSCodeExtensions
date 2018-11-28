"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const url = __importStar(require("url"));
const vscode_1 = require("vscode");
const Constants = __importStar(require("../common/constants"));
const httpElement_1 = require("../models/httpElement");
const environmentVariableProvider_1 = require("./httpVariableProviders/environmentVariableProvider");
const fileVariableProvider_1 = require("./httpVariableProviders/fileVariableProvider");
const requestVariableProvider_1 = require("./httpVariableProviders/requestVariableProvider");
const persistUtility_1 = require("./persistUtility");
class HttpElementFactory {
    static getHttpElements(document, line) {
        return __awaiter(this, void 0, void 0, function* () {
            let originalElements = [];
            // add http methods
            originalElements.push(new httpElement_1.HttpElement('GET', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('POST', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('PUT', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('DELETE', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('PATCH', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('HEAD', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('OPTIONS', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('TRACE', httpElement_1.ElementType.Method));
            originalElements.push(new httpElement_1.HttpElement('CONNECT', httpElement_1.ElementType.Method));
            // add http headers
            originalElements.push(new httpElement_1.HttpElement('Accept', httpElement_1.ElementType.Header, null, 'Specify certain media types which are acceptable for the response'));
            originalElements.push(new httpElement_1.HttpElement('Accept-Charset', httpElement_1.ElementType.Header, null, 'Indicate what character sets are acceptable for the response'));
            originalElements.push(new httpElement_1.HttpElement('Accept-Encoding', httpElement_1.ElementType.Header, null, 'Indicate the content-codings that are acceptable in the response'));
            originalElements.push(new httpElement_1.HttpElement('Accept-Language', httpElement_1.ElementType.Header, null, 'Indicate the set of natural languages that are preferred as a response to the request'));
            originalElements.push(new httpElement_1.HttpElement('Accept-Datetime', httpElement_1.ElementType.Header, null, 'Indicate it wants to access a past state of an original resource'));
            originalElements.push(new httpElement_1.HttpElement('Authorization', httpElement_1.ElementType.Header, null, 'Consists of credentials containing the authentication information of the user agent for the realm of the resource being requested'));
            originalElements.push(new httpElement_1.HttpElement('Cache-Control', httpElement_1.ElementType.Header, null, 'Specify directives that MUST be obeyed by all caching mechanisms along the request/response chain'));
            originalElements.push(new httpElement_1.HttpElement('Connection', httpElement_1.ElementType.Header, null, 'Specify options that are desired for that particular connection and MUST NOT be communicated by proxies over further connections'));
            originalElements.push(new httpElement_1.HttpElement('Content-Length', httpElement_1.ElementType.Header, null, 'Indicate the size of the entity-body'));
            originalElements.push(new httpElement_1.HttpElement('Content-MD5', httpElement_1.ElementType.Header, null, 'Provide an end-to-end message integrity check of the entity-body'));
            originalElements.push(new httpElement_1.HttpElement('Content-Type', httpElement_1.ElementType.Header, null, 'Indicate the media type of the entity-body sent to the recipient or, in the case of the HEAD method, the media type that would have been sent had the request been a GET'));
            originalElements.push(new httpElement_1.HttpElement('Cookie', httpElement_1.ElementType.Header, null, 'An HTTP cookie previously sent by the server with Set-Cookie'));
            originalElements.push(new httpElement_1.HttpElement('Date', httpElement_1.ElementType.Header, null, 'Represent the date and time at which the message was originated'));
            originalElements.push(new httpElement_1.HttpElement('Expect', httpElement_1.ElementType.Header, null, 'Indicate that particular server behaviors are required by the client'));
            originalElements.push(new httpElement_1.HttpElement('Forwarded', httpElement_1.ElementType.Header, null, 'Disclose original information of a client connecting to a web server through an HTTP proxy'));
            originalElements.push(new httpElement_1.HttpElement('From', httpElement_1.ElementType.Header, null, 'The email address of the user making the request'));
            originalElements.push(new httpElement_1.HttpElement('Host', httpElement_1.ElementType.Header, null, 'Specify the Internet host and port number of the resource being requested'));
            originalElements.push(new httpElement_1.HttpElement('If-Match', httpElement_1.ElementType.Header, null, 'Only perform the action if the client supplied entity matches the same entity on the server. This is mainly for methods like PUT to only update a resource if it has not been modified since the user last updated it'));
            originalElements.push(new httpElement_1.HttpElement('If-Modified-Since', httpElement_1.ElementType.Header, null, 'Allows a 304 Not Modified to be returned if content is unchanged since the time specified in this field'));
            originalElements.push(new httpElement_1.HttpElement('If-None-Match', httpElement_1.ElementType.Header, null, 'Allows a 304 Not Modified to be returned if content is unchanged for ETag'));
            originalElements.push(new httpElement_1.HttpElement('If-Range', httpElement_1.ElementType.Header, null, 'If the entity is unchanged, send me the part(s) that I am missing; otherwise, send me the entire new entity.'));
            originalElements.push(new httpElement_1.HttpElement('If-Unmodified-Since', httpElement_1.ElementType.Header, null, 'Only send the response if the entity has not been modified since a specific time'));
            originalElements.push(new httpElement_1.HttpElement('Max-Forwards', httpElement_1.ElementType.Header, null, 'Provide a mechanism with the TRACE and OPTIONS methods to limit the number of proxies or gateways that can forward the request to the next inbound server'));
            originalElements.push(new httpElement_1.HttpElement('Origin', httpElement_1.ElementType.Header, null, 'Initiate a request for cross-origin resource sharing'));
            originalElements.push(new httpElement_1.HttpElement('Pragma', httpElement_1.ElementType.Header, null, 'Include implementation-specific directives that might apply to any recipient along the request/response chain'));
            originalElements.push(new httpElement_1.HttpElement('Proxy-Authorization', httpElement_1.ElementType.Header, null, 'Allows the client to identify itself (or its user) to a proxy which requires authentication'));
            originalElements.push(new httpElement_1.HttpElement('Range', httpElement_1.ElementType.Header, null, 'Request only part of an entity. Bytes are numbered from 0'));
            originalElements.push(new httpElement_1.HttpElement('Referer', httpElement_1.ElementType.Header, null, 'Allow the client to specify, for the server\'s benefit, the address (URI) of the resource from which the Request-URI was obtained'));
            originalElements.push(new httpElement_1.HttpElement('TE', httpElement_1.ElementType.Header, null, 'Indicate what extension transfer-codings it is willing to accept in the response and whether or not it is willing to accept trailer fields in a chunked transfer-coding'));
            originalElements.push(new httpElement_1.HttpElement('Upgrade', httpElement_1.ElementType.Header, null, 'Allow the client to specify what additional communication protocols it supports and would like to use if the server finds it appropriate to switch protocols'));
            originalElements.push(new httpElement_1.HttpElement('User-Agent', httpElement_1.ElementType.Header, null, 'Contain information about the user agent originating the request'));
            originalElements.push(new httpElement_1.HttpElement('Via', httpElement_1.ElementType.Header, null, 'Indicate the intermediate protocols and recipients between the user agent and the server on requests, and between the origin server and the client on responses'));
            originalElements.push(new httpElement_1.HttpElement('Warning', httpElement_1.ElementType.Header, null, 'Carry additional information about the status or transformation of a message which might not be reflected in the message'));
            originalElements.push(new httpElement_1.HttpElement('X-Http-Method-Override', httpElement_1.ElementType.Header, null, 'Requests a web application override the method specified in the request (typically POST) with the method given in the header field (typically PUT or DELETE). Can be used when a user agent or firewall prevents PUT or DELETE methods from being sent directly'));
            // add value for specific header like Accept and Content-Type
            originalElements.push(new httpElement_1.HttpElement("application/json", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/xml", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/javascript", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/xhtml+xml", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/octet-stream", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/soap+xml", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/zip", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/gzip", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("application/x-www-form-urlencoded", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("image/gif", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("image/jpeg", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("image/png", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("message/http", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("multipart/form-data", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("text/css", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("text/csv", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("text/html", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("text/plain", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            originalElements.push(new httpElement_1.HttpElement("text/xml", httpElement_1.ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
            // add Basic, Digest Authentication snippet
            originalElements.push(new httpElement_1.HttpElement("Basic Base64", httpElement_1.ElementType.Authentication, '^\\s*Authorization\\s*\\:\\s*', "Base64 encoded username and password", new vscode_1.SnippetString(`Basic \${1:base64-user-password}`)));
            originalElements.push(new httpElement_1.HttpElement("Basic Raw Credential", httpElement_1.ElementType.Authentication, '^\\s*Authorization\\s*\\:\\s*', "Raw username and password", new vscode_1.SnippetString(`Basic \${1:username} \${2:password}`)));
            originalElements.push(new httpElement_1.HttpElement("Digest", httpElement_1.ElementType.Authentication, '^\\s*Authorization\\s*\\:\\s*', "Raw username and password", new vscode_1.SnippetString(`Digest \${1:username} \${2:password}`)));
            // add global variables
            originalElements.push(new httpElement_1.HttpElement(Constants.GuidVariableName, httpElement_1.ElementType.SystemVariable, null, Constants.GuidVariableDescription, new vscode_1.SnippetString(`{{$\${name:${Constants.GuidVariableName.slice(1)}}}}`)));
            originalElements.push(new httpElement_1.HttpElement(Constants.TimeStampVariableName, httpElement_1.ElementType.SystemVariable, null, Constants.TimeStampVariableDescription, new vscode_1.SnippetString(`{{$\${name:${Constants.TimeStampVariableName.slice(1)}}}}`)));
            originalElements.push(new httpElement_1.HttpElement(Constants.DateTimeVariableName, httpElement_1.ElementType.SystemVariable, null, Constants.DateTimeVariableNameDescription, new vscode_1.SnippetString(`{{$\${name:${Constants.DateTimeVariableName.slice(1)}} \${1|rfc1123,iso8601|}}}`)));
            originalElements.push(new httpElement_1.HttpElement(Constants.RandomIntVariableName, httpElement_1.ElementType.SystemVariable, null, Constants.RandomIntDescription, new vscode_1.SnippetString(`{{$\${name:${Constants.RandomIntVariableName.slice(1)}} \${1:min} \${2:max}}}`)));
            originalElements.push(new httpElement_1.HttpElement(Constants.AzureActiveDirectoryVariableName, httpElement_1.ElementType.SystemVariable, null, Constants.AzureActiveDirectoryDescription, new vscode_1.SnippetString(`{{$\${name:${Constants.AzureActiveDirectoryVariableName.slice(1)}}}}`)));
            // add environment custom variables
            const environmentVariables = yield environmentVariableProvider_1.EnvironmentVariableProvider.Instance.getAll(document);
            for (const { name, value } of environmentVariables) {
                originalElements.push(new httpElement_1.HttpElement(name, httpElement_1.ElementType.EnvironmentCustomVariable, null, new vscode_1.MarkdownString(`Value: \`${value}\``), new vscode_1.SnippetString(`{{${name}}}`)));
            }
            // add file custom variables
            const fileVariables = yield fileVariableProvider_1.FileVariableProvider.Instance.getAll(document);
            for (const { name, value } of fileVariables) {
                originalElements.push(new httpElement_1.HttpElement(name, httpElement_1.ElementType.FileCustomVariable, '^\\s*[^@]', new vscode_1.MarkdownString(`Value: \`${value}\``), new vscode_1.SnippetString(`{{${name}}}`)));
            }
            // add request variables
            const requestVariables = yield requestVariableProvider_1.RequestVariableProvider.Instance.getAll(document);
            for (const { name, value } of requestVariables) {
                const v = new vscode_1.MarkdownString(`Value: Request Variable ${name}${value ? '' : ' *(Inactive)*'}`);
                originalElements.push(new httpElement_1.HttpElement(name, httpElement_1.ElementType.RequestCustomVariable, null, v, new vscode_1.SnippetString(`{{${name}.\${1|request,response|}.\${2|headers,body|}.\${3:Header Name, *(Full Body), JSONPath or XPath}}}`)));
            }
            // add urls from history
            let historyItems = yield persistUtility_1.PersistUtility.loadRequests();
            let distinctRequestUrls = Array.from(new Set(historyItems.map(item => item.url)));
            distinctRequestUrls.forEach(requestUrl => {
                let protocol = url.parse(requestUrl).protocol;
                let prefixLength = protocol.length + 2; // https: + //
                originalElements.push(new httpElement_1.HttpElement(`${requestUrl.substr(prefixLength)}`, httpElement_1.ElementType.URL, '^\\s*(?:(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)\\s+)https?\\:\\/{2}'));
            });
            let elements = [];
            if (line) {
                originalElements.forEach(element => {
                    if (element.prefix) {
                        if (line.match(new RegExp(element.prefix, 'i'))) {
                            elements.push(element);
                        }
                    }
                });
            }
            if (elements.length === 0) {
                elements = originalElements.filter(e => !e.prefix);
            }
            else if (elements.every(e => e.type === httpElement_1.ElementType.FileCustomVariable || e.type === httpElement_1.ElementType.RequestCustomVariable)) {
                elements = elements.concat(originalElements.filter(e => !e.prefix));
            }
            else {
                // add global/custom variables anyway
                originalElements.filter(e => !e.prefix && (e.type === httpElement_1.ElementType.SystemVariable || e.type === httpElement_1.ElementType.EnvironmentCustomVariable || e.type === httpElement_1.ElementType.FileCustomVariable || e.type === httpElement_1.ElementType.RequestCustomVariable)).forEach(element => {
                    elements.push(element);
                });
            }
            return elements;
        });
    }
}
exports.HttpElementFactory = HttpElementFactory;
//# sourceMappingURL=httpElementFactory.js.map