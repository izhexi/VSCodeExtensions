"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const ZLib = require("zlib");
/**
 * Tries to compress data for a reponse.
 *
 * @param {any} data The data to compress.
 * @param {rapi_contracts.RequestContext} ctx The underlying request context.
 * @param {string} encoding The custom text encoding to use, if 'data' is no buffer.
 *
 * @return {PromiseLike<CompressForResponseResult>} The result.
 */
function compressForResponse(data, ctx, encoding) {
    encoding = rapi_helpers.normalizeString(encoding);
    if (!encoding) {
        encoding = 'utf8';
    }
    return new Promise((resolve, reject) => {
        try {
            let uncompressed = rapi_helpers.asBuffer(data, encoding);
            if (!uncompressed) {
                uncompressed = Buffer.alloc(0);
            }
            let compressed;
            let contentEncoding;
            let dataToSend = uncompressed;
            let completed = (err) => {
                resolve({
                    compressed: compressed,
                    contentEncoding: contentEncoding,
                    dataToSend: dataToSend,
                    error: err,
                    uncompressed: uncompressed,
                });
            };
            let acceptEncodings = rapi_helpers.toStringSafe(rapi_helpers.getHeaderValue(ctx.request.headers, 'Accept-Encoding'))
                .toLowerCase()
                .split(',')
                .map(x => rapi_helpers.toStringSafe(x).toLowerCase().trim())
                .filter(x => x);
            if (acceptEncodings.indexOf('gzip') > -1) {
                // gzip
                ZLib.gzip(uncompressed, (err, compressedData) => {
                    if (!err) {
                        if (compressedData.length < uncompressed.length) {
                            contentEncoding = 'gzip';
                            compressed = compressedData;
                            dataToSend = compressed;
                        }
                    }
                    completed(err);
                });
            }
            else if (acceptEncodings.indexOf('deflate') > -1) {
                // deflate
                ZLib.deflate(uncompressed, (err, compressedData) => {
                    if (!err) {
                        if (compressedData.length < uncompressed.length) {
                            contentEncoding = 'deflate';
                            compressed = compressedData;
                            dataToSend = compressed;
                        }
                    }
                    completed(err);
                });
            }
            else {
                // no encoding
                completed();
            }
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.compressForResponse = compressForResponse;
/**
 * Sends an error response.
 *
 * @param {any} err The error to send.
 * @param {rapi_contracts.RequestContext} ctx The request context.
 * @param {number} code The custom status code to send.
 */
function sendError(err, ctx, code = 500) {
    try {
        ctx.response.statusCode = code;
        ctx.response.statusMessage = rapi_helpers.toStringSafe(err);
        ctx.response.end();
    }
    catch (e) {
        this.controller.log(`[ERROR] host.helpers.sendError(): ${rapi_helpers.toStringSafe(e)}`);
    }
}
exports.sendError = sendError;
/**
 * Sends a "forbidden" response.
 *
 * @param {rapi_contracts.RequestContext} ctx The request context.
 * @param {number} code The custom status code to send.
 */
function sendForbidden(ctx, code = 403) {
    try {
        ctx.response.statusCode = code;
        ctx.response.end();
    }
    catch (e) {
        this.controller.log(`[ERROR] host.helpers.sendForbidden(): ${rapi_helpers.toStringSafe(e)}`);
    }
}
exports.sendForbidden = sendForbidden;
/**
 * Sends a "method not allowed" response.
 *
 * @param {rapi_contracts.RequestContext} ctx The request context.
 * @param {number} code The custom status code to send.
 */
function sendMethodNotAllowed(ctx, code = 405) {
    try {
        ctx.response.statusCode = code;
        ctx.response.end();
    }
    catch (e) {
        this.controller.log(`[ERROR] host.helpers.sendMethodNotAllowed(): ${rapi_helpers.toStringSafe(e)}`);
    }
}
exports.sendMethodNotAllowed = sendMethodNotAllowed;
/**
 * Sends a "not found" response.
 *
 * @param {rapi_contracts.RequestContext} ctx The request context.
 * @param {number} code The custom status code to send.
 */
function sendNotFound(ctx, code = 404) {
    try {
        ctx.response.statusCode = code;
        ctx.response.end();
    }
    catch (e) {
        this.controller.log(`[ERROR] host.helpers.sendNotFound(): ${rapi_helpers.toStringSafe(e)}`);
    }
}
exports.sendNotFound = sendNotFound;
/**
 * Sends a "not implemented" response.
 *
 * @param {rapi_contracts.RequestContext} ctx The request context.
 * @param {number} code The custom status code to send.
 */
function sendNotImplemented(ctx, code = 501) {
    try {
        ctx.response.statusCode = code;
        ctx.response.end();
    }
    catch (e) {
        this.controller.log(`[ERROR] host.helpers.sendNotImplemented(): ${rapi_helpers.toStringSafe(e)}`);
    }
}
exports.sendNotImplemented = sendNotImplemented;
/**
 * Sends an "unauthorized" response.
 *
 * @param {rapi_contracts.RequestContext} ctx The request context.
 * @param {number} code The custom status code to send.
 */
function sendUnauthorized(ctx, code = 401) {
    try {
        let realm = rapi_helpers.toStringSafe(ctx.config.realm);
        if (rapi_helpers.isEmptyString(realm)) {
            realm = 'REST API for Visual Studio Code (vs-rest-api)';
        }
        let headers = {
            'WWW-Authenticate': `Basic realm="${realm}"`,
        };
        ctx.response.writeHead(code, headers);
        ctx.response.end();
    }
    catch (e) {
        this.controller.log(`[ERROR] host.helpers.sendUnauthorized(): ${rapi_helpers.toStringSafe(e)}`);
    }
}
exports.sendUnauthorized = sendUnauthorized;
/**
 * Extracts the query parameters of an URL to an object.
 *
 * @param {URL.Url} url The URL.
 *
 * @return {Object} The parameters of the URL as object.
 */
function urlParamsToObject(url) {
    if (!url) {
        return url;
    }
    let params;
    if (!rapi_helpers.isEmptyString(url.query)) {
        // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
        params = url.query.replace(/(^\?)/, '')
            .split("&")
            .map(function (n) {
            return n = n.split("="), this[rapi_helpers.normalizeString(n[0])] =
                rapi_helpers.toStringSafe(decodeURIComponent(n[1])), this;
        }
            .bind({}))[0];
    }
    if (!params) {
        params = {};
    }
    return params;
}
exports.urlParamsToObject = urlParamsToObject;
//# sourceMappingURL=helpers.js.map