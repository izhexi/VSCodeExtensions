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
const fs = __importStar(require("fs-extra"));
const iconv = __importStar(require("iconv-lite"));
const path = __importStar(require("path"));
const url = __importStar(require("url"));
const vscode_1 = require("vscode");
const configurationSettings_1 = require("../models/configurationSettings");
const hostCertificate_1 = require("../models/hostCertificate");
const httpRequest_1 = require("../models/httpRequest");
const httpResponse_1 = require("../models/httpResponse");
const httpResponseTimingPhases_1 = require("../models/httpResponseTimingPhases");
const mimeUtility_1 = require("./mimeUtility");
const misc_1 = require("./misc");
const persistUtility_1 = require("./persistUtility");
const workspaceUtility_1 = require("./workspaceUtility");
const encodeUrl = require('encodeurl');
const request = require('request');
const cookieStore = require('tough-cookie-file-store-bugfix');
class HttpClient {
    constructor() {
        this._settings = configurationSettings_1.RestClientSettings.Instance;
        persistUtility_1.PersistUtility.ensureCookieFile();
    }
    send(httpRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = yield this.prepareOptions(httpRequest);
            let size = 0;
            let headersSize = 0;
            return new Promise((resolve, reject) => {
                const that = this;
                request(options, function (error, response, body) {
                    if (error) {
                        if (error.message) {
                            if (error.message.startsWith("Header name must be a valid HTTP Token")) {
                                error.message = "Header must be in 'header name: header value' format, "
                                    + "please also make sure there is a blank line between headers and body";
                            }
                        }
                        reject(error);
                        return;
                    }
                    let contentType = misc_1.getHeader(response.headers, 'Content-Type');
                    let encoding;
                    if (contentType) {
                        encoding = mimeUtility_1.MimeUtility.parse(contentType).charset;
                    }
                    if (!encoding) {
                        encoding = "utf8";
                    }
                    const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
                    let bodyString;
                    try {
                        bodyString = iconv.decode(bodyBuffer, encoding);
                    }
                    catch (_a) {
                        if (encoding !== 'utf8') {
                            bodyString = iconv.decode(bodyBuffer, 'utf8');
                        }
                    }
                    if (that._settings.decodeEscapedUnicodeCharacters) {
                        bodyString = that.decodeEscapedUnicodeCharacters(bodyString);
                    }
                    // adjust response header case, due to the response headers in request package is in lowercase
                    let headersDic = HttpClient.getResponseRawHeaderNames(response.rawHeaders);
                    let adjustedResponseHeaders = {};
                    for (let header in response.headers) {
                        let adjustedHeaderName = header;
                        if (headersDic[header]) {
                            adjustedHeaderName = headersDic[header];
                            adjustedResponseHeaders[headersDic[header]] = response.headers[header];
                        }
                        adjustedResponseHeaders[adjustedHeaderName] = response.headers[header];
                    }
                    const requestBody = options.body;
                    resolve(new httpResponse_1.HttpResponse(response.statusCode, response.statusMessage, response.httpVersion, adjustedResponseHeaders, bodyString, response.elapsedTime, size, headersSize, bodyBuffer, new httpResponseTimingPhases_1.HttpResponseTimingPhases(response.timingPhases.total, response.timingPhases.wait, response.timingPhases.dns, response.timingPhases.tcp, response.timingPhases.firstByte, response.timingPhases.download), new httpRequest_1.HttpRequest(options.method, options.url, HttpClient.capitalizeHeaderName(response.toJSON().request.headers), Buffer.isBuffer(requestBody) ? fs.createReadStream(requestBody) : requestBody, httpRequest.rawBody)));
                })
                    .on('data', function (data) {
                    size += data.length;
                })
                    .on('response', function (response) {
                    if (response.rawHeaders) {
                        headersSize += response.rawHeaders.map(h => h.length).reduce((a, b) => a + b, 0);
                        headersSize += (response.rawHeaders.length) / 2;
                    }
                });
            });
        });
    }
    prepareOptions(httpRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            const originalRequestBody = httpRequest.body;
            let requestBody;
            if (originalRequestBody) {
                if (typeof originalRequestBody !== 'string') {
                    requestBody = yield this.convertStreamToBuffer(originalRequestBody);
                }
                else {
                    requestBody = originalRequestBody;
                }
            }
            let options = {
                url: encodeUrl(httpRequest.url),
                headers: httpRequest.headers,
                method: httpRequest.method,
                body: requestBody,
                encoding: null,
                time: true,
                timeout: this._settings.timeoutInMilliseconds,
                followRedirect: this._settings.followRedirect,
                jar: this._settings.rememberCookiesForSubsequentRequests ? request.jar(new cookieStore(persistUtility_1.PersistUtility.cookieFilePath)) : false,
                strictSSL: false,
                forever: true
            };
            // set auth to digest if Authorization header follows: Authorization: Digest username password
            let authorization = misc_1.getHeader(options.headers, 'Authorization');
            if (authorization) {
                let start = authorization.indexOf(' ');
                let scheme = authorization.substr(0, start);
                if (scheme === 'Digest' || scheme === 'Basic') {
                    let params = authorization.substr(start).trim().split(' ');
                    let [user, pass] = params;
                    if (user && pass) {
                        options.auth = {
                            user,
                            pass,
                            sendImmediately: scheme === 'Basic'
                        };
                    }
                }
            }
            // set certificate
            let certificate = this.getRequestCertificate(httpRequest.url);
            if (certificate) {
                options.cert = certificate.cert;
                options.key = certificate.key;
                options.pfx = certificate.pfx;
                options.passphrase = certificate.passphrase;
            }
            // set proxy
            if (this._settings.proxy && !HttpClient.ignoreProxy(httpRequest.url, this._settings.excludeHostsForProxy)) {
                const proxyEndpoint = url.parse(this._settings.proxy);
                if (/^https?:$/.test(proxyEndpoint.protocol)) {
                    const proxyOptions = {
                        host: proxyEndpoint.hostname,
                        port: +proxyEndpoint.port,
                        rejectUnauthorized: this._settings.proxyStrictSSL
                    };
                    const ctor = (httpRequest.url.startsWith('http:')
                        ? yield Promise.resolve().then(() => __importStar(require('http-proxy-agent')))
                        : yield Promise.resolve().then(() => __importStar(require('https-proxy-agent')))).default;
                    options.agent = new ctor(proxyOptions);
                }
            }
            if (this._settings.proxy && !options.agent) {
                options.proxy = null;
            }
            if (!options.headers) {
                options.headers = httpRequest.headers = {};
            }
            // add default headers if not specified
            for (let header in this._settings.defaultHeaders) {
                if (!misc_1.hasHeader(options.headers, header) && (header.toLowerCase() !== 'host' || httpRequest.url[0] === '/')) {
                    const value = this._settings.defaultHeaders[header];
                    if (value) {
                        options.headers[header] = value;
                    }
                }
            }
            const acceptEncoding = misc_1.getHeader(options.headers, 'Accept-Encoding');
            if (acceptEncoding && acceptEncoding.includes('gzip')) {
                options.gzip = true;
            }
            return options;
        });
    }
    convertStreamToBuffer(stream) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const buffers = [];
                stream.on('data', buffer => buffers.push(typeof buffer === 'string' ? Buffer.from(buffer) : buffer));
                stream.on('end', () => resolve(Buffer.concat(buffers)));
                stream.on('error', error => reject(error));
                stream.resume();
            });
        });
    }
    decodeEscapedUnicodeCharacters(body) {
        return body.replace(/\\u([\d\w]{4})/gi, (_, g) => String.fromCharCode(parseInt(g, 16)));
    }
    getRequestCertificate(requestUrl) {
        const host = url.parse(requestUrl).host;
        if (host in this._settings.hostCertificates) {
            let certificate = this._settings.hostCertificates[host];
            let cert = undefined, key = undefined, pfx = undefined;
            if (certificate.cert) {
                let certPath = HttpClient.resolveCertificateFullPath(certificate.cert, "cert");
                if (certPath) {
                    cert = fs.readFileSync(certPath);
                }
            }
            if (certificate.key) {
                let keyPath = HttpClient.resolveCertificateFullPath(certificate.key, "key");
                if (keyPath) {
                    key = fs.readFileSync(keyPath);
                }
            }
            if (certificate.pfx) {
                let pfxPath = HttpClient.resolveCertificateFullPath(certificate.pfx, "pfx");
                if (pfxPath) {
                    pfx = fs.readFileSync(pfxPath);
                }
            }
            return new hostCertificate_1.HostCertificate(cert, key, pfx, certificate.passphrase);
        }
    }
    static getResponseRawHeaderNames(rawHeaders) {
        let result = {};
        rawHeaders.forEach(header => {
            result[header.toLowerCase()] = header;
        });
        return result;
    }
    static ignoreProxy(requestUrl, excludeHostsForProxy) {
        if (!excludeHostsForProxy || excludeHostsForProxy.length === 0) {
            return false;
        }
        let resolvedUrl = url.parse(requestUrl);
        let hostName = resolvedUrl.hostname && resolvedUrl.hostname.toLowerCase();
        let port = resolvedUrl.port;
        let excludeHostsProxyList = Array.from(new Set(excludeHostsForProxy.map(eh => eh.toLowerCase())));
        for (let index = 0; index < excludeHostsProxyList.length; index++) {
            let eh = excludeHostsProxyList[index];
            let urlParts = eh.split(":");
            if (!port) {
                // if no port specified in request url, host name must exactly match
                if (urlParts.length === 1 && urlParts[0] === hostName) {
                    return true;
                }
            }
            else {
                // if port specified, match host without port or hostname:port exactly match
                let [ph, pp] = urlParts;
                if (ph === hostName && (!pp || pp === port)) {
                    return true;
                }
            }
        }
        return false;
    }
    static resolveCertificateFullPath(absoluteOrRelativePath, certName) {
        if (path.isAbsolute(absoluteOrRelativePath)) {
            if (!fs.existsSync(absoluteOrRelativePath)) {
                vscode_1.window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
                return;
            }
            else {
                return absoluteOrRelativePath;
            }
        }
        // the path should be relative path
        let rootPath = workspaceUtility_1.getWorkspaceRootPath();
        let absolutePath = '';
        if (rootPath) {
            absolutePath = path.join(vscode_1.Uri.parse(rootPath).fsPath, absoluteOrRelativePath);
            if (fs.existsSync(absolutePath)) {
                return absolutePath;
            }
            else {
                vscode_1.window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
                return;
            }
        }
        absolutePath = path.join(path.dirname(vscode_1.window.activeTextEditor.document.fileName), absoluteOrRelativePath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }
        else {
            vscode_1.window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} of ${certName} doesn't exist, please make sure it exists.`);
            return;
        }
    }
    static capitalizeHeaderName(headers) {
        let normalizedHeaders = {};
        if (headers) {
            for (let header in headers) {
                let capitalizedName = header.replace(/([^-]+)/g, h => h.charAt(0).toUpperCase() + h.slice(1));
                normalizedHeaders[capitalizedName] = headers[header];
            }
        }
        return normalizedHeaders;
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=httpClient.js.map