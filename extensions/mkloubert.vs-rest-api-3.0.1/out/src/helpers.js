"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
// The MIT License (MIT)
// 
// vs-rest-api (https://github.com/mkloubert/vs-rest-api)
// Copyright (c) Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
const ChildProcess = require("child_process");
const Entities = require('html-entities').AllHtmlEntities;
const FS = require("fs");
const i18 = require("./i18");
const IsBinaryFile = require("isbinaryfile");
const MIME = require('mime');
const Moment = require("moment");
const Path = require("path");
const rapi_contracts = require("./contracts");
const rapi_host_users = require("./host/users");
const rapi_workspace = require("./workspace");
const vscode = require("vscode");
const ZLib = require("zlib");
let nextHtmlDocId = -1;
/**
 * Returns a value as array.
 *
 * @param {T | T[]} val The value.
 *
 * @return {T[]} The value as array.
 */
function asArray(val) {
    if (!Array.isArray(val)) {
        return [val];
    }
    return val;
}
exports.asArray = asArray;
/**
 * Returns data as buffer.
 *
 * @param {any} val The input value.
 *
 * @returns {Buffer} The output value.
 */
function asBuffer(val, enc) {
    if (isNullOrUndefined(val)) {
        return val;
    }
    enc = normalizeString(enc);
    if (!enc) {
        enc = 'utf8';
    }
    let buff = val;
    if ('object' !== typeof val) {
        buff = new Buffer(toStringSafe(val), enc);
    }
    return buff;
}
exports.asBuffer = asBuffer;
/**
 * Cleans up a string.
 *
 * @param {any} str The string to cleanup.
 * @param {any} allowedChars The allowed chars.
 * @param {any} replaceWith The expression to use to replace non-allowed chars.
 *
 * @return {string} The cleanup string.
 */
function cleanupString(str, allowedChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_', replaceWith = '') {
    if (!str) {
        return str;
    }
    str = toStringSafe(str);
    allowedChars = toStringSafe(allowedChars);
    replaceWith = toStringSafe(replaceWith);
    let newString = '';
    for (let i = 0; i < str.length; i++) {
        let c = str[i];
        if (allowedChars.indexOf(c) > -1) {
            newString += c;
        }
        else {
            newString += replaceWith; // not allowed
        }
    }
    return newString;
}
exports.cleanupString = cleanupString;
/**
 * Clones an object / value deep.
 *
 * @param {T} val The value / object to clone.
 *
 * @return {T} The cloned value / object.
 */
function cloneObject(val) {
    if (!val) {
        return val;
    }
    return JSON.parse(JSON.stringify(val));
}
exports.cloneObject = cloneObject;
/**
 * Compares two values for a sort operation.
 *
 * @param {T} x The left value.
 * @param {T} y The right value.
 *
 * @return {number} The "sort value".
 */
function compareValues(x, y) {
    if (x === y) {
        return 0;
    }
    if (x > y) {
        return 1;
    }
    if (x < y) {
        return -1;
    }
    return 0;
}
exports.compareValues = compareValues;
/**
 * Creates a simple 'completed' callback for a promise.
 *
 * @param {Function} resolve The 'succeeded' callback.
 * @param {Function} reject The 'error' callback.
 *
 * @return {SimpleCompletedAction<TResult>} The created action.
 */
function createSimplePromiseCompletedAction(resolve, reject) {
    return (err, result) => {
        if (err) {
            if (reject) {
                reject(err);
            }
        }
        else {
            if (resolve) {
                resolve(result);
            }
        }
    };
}
exports.createSimplePromiseCompletedAction = createSimplePromiseCompletedAction;
/**
 * Tries to detect the MIME type of a file.
 *
 * @param {string} file The Filename.
 * @param {any} defValue The default value.
 *
 * @return {string} The MIME type.
 */
function detectMimeByFilename(file, defValue = 'application/octet-stream') {
    let mime;
    try {
        try {
            let ext = normalizeString(Path.extname(file));
            if (ext) {
                ext = ext.substr(1).trim();
            }
            switch (ext) {
                case 'ts':
                    mime = 'text/typescript';
                    break;
            }
        }
        catch (e) {
            log(`[ERROR] helpers.detectMimeByFilename(2): ${toStringSafe(e)}`);
        }
        if (!mime) {
            mime = MIME.lookup(file);
        }
    }
    catch (e) {
        log(`[ERROR] helpers.detectMimeByFilename(1): ${toStringSafe(e)}`);
    }
    mime = toStringSafe(mime).toLowerCase().trim();
    if (!mime) {
        mime = defValue;
    }
    return mime;
}
exports.detectMimeByFilename = detectMimeByFilename;
/**
 * Removes duplicate entries from an array.
 *
 * @param {T[]} arr The input array.
 *
 * @return {T[]} The filtered array.
 */
function distinctArray(arr) {
    if (!arr) {
        return arr;
    }
    return arr.filter((x, i) => arr.indexOf(x) == i);
}
exports.distinctArray = distinctArray;
/**
 * Formats a string.
 *
 * @param {any} formatStr The value that represents the format string.
 * @param {any[]} [args] The arguments for 'formatStr'.
 *
 * @return {string} The formated string.
 */
function format(formatStr, ...args) {
    return formatArray(formatStr, args);
}
exports.format = format;
/**
 * Formats a string.
 *
 * @param {any} formatStr The value that represents the format string.
 * @param {any[]} [args] The arguments for 'formatStr'.
 *
 * @return {string} The formated string.
 */
function formatArray(formatStr, args) {
    if (!args) {
        args = [];
    }
    formatStr = toStringSafe(formatStr);
    // apply arguments in
    // placeholders
    return formatStr.replace(/{(\d+)(\:)?([^}]*)}/g, (match, index, formatSeparator, formatExpr) => {
        index = parseInt(toStringSafe(index).trim());
        let resultValue = args[index];
        if (':' === formatSeparator) {
            // collect "format providers"
            let formatProviders = toStringSafe(formatExpr).split(',')
                .map(x => x.toLowerCase().trim())
                .filter(x => x);
            // transform argument by
            // format providers
            formatProviders.forEach(fp => {
                switch (fp) {
                    case 'entities':
                        resultValue = toStringSafe(resultValue);
                        if (resultValue) {
                            resultValue = toStringSafe(Entities.encode(resultValue));
                        }
                        break;
                    case 'json':
                        resultValue = JSON.stringify(resultValue);
                        break;
                    case 'json_pretty':
                        resultValue = JSON.stringify(resultValue, null, 4);
                        break;
                    case 'leading_space':
                        resultValue = toStringSafe(resultValue);
                        if (resultValue) {
                            resultValue = ' ' + resultValue;
                        }
                        break;
                    case 'lower':
                        resultValue = toStringSafe(resultValue).toLowerCase();
                        break;
                    case 'trim':
                        resultValue = toStringSafe(resultValue).trim();
                        break;
                    case 'upper':
                        resultValue = toStringSafe(resultValue).toUpperCase();
                        break;
                    case 'uri_comp':
                        resultValue = toStringSafe(resultValue);
                        if (resultValue) {
                            resultValue = encodeURIComponent(resultValue);
                        }
                        break;
                    case 'surround':
                        resultValue = toStringSafe(resultValue);
                        if (resultValue) {
                            resultValue = "'" + toStringSafe(resultValue) + "'";
                        }
                        break;
                }
            });
        }
        if ('undefined' === typeof resultValue) {
            return match;
        }
        return toStringSafe(resultValue);
    });
}
exports.formatArray = formatArray;
/**
 * Returns Base64 stored content that is stored in object(s).
 *
 * @param {string} key The key with the data.
 * @param {Object|Object[]} objs The object(s).
 * @param {boolean} compressed Is data compressed or not.
 *
 * @return {Buffer} The data (if found).
 */
function getBase64ContentFromObjects(key, objs, compressed = false) {
    let allObjects = asArray(objs).filter(x => x);
    key = normalizeString(key);
    let data;
    while (allObjects.length > 0) {
        let o = allObjects.shift();
        for (let p in o) {
            if (normalizeString(p) == key) {
                data = new Buffer(o[p], 'base64');
                break;
            }
        }
    }
    if (data) {
        if (toBooleanSafe(compressed)) {
            data = ZLib.gunzipSync(data);
        }
    }
    return data;
}
exports.getBase64ContentFromObjects = getBase64ContentFromObjects;
/**
 * Tries to return a value from a "header" object.
 *
 * @param {any} headers The object with the header values.
 * @param {string} key The key.
 * @param {any} [defaultValue] The default value.
 *
 * @return {string} The value from the object.
 */
function getHeaderValue(headers, key, defaultValue) {
    if (!headers) {
        return defaultValue;
    }
    key = normalizeString(key);
    let value = defaultValue;
    for (let p in headers) {
        if (normalizeString(p) == key) {
            value = toStringSafe(headers[p]);
        }
    }
    return value;
}
exports.getHeaderValue = getHeaderValue;
/**
 * Returns the state repository item for a memento.
 *
 * @param {vscode.Memento} memento The memento.
 * @param {string} [varName] The name of the variable inside the memento.
 *
 * @return {rapi_contracts.StateRepository} The item.
 */
function getStateRepository(memento, varName = rapi_contracts.VAR_STATE) {
    if (!memento) {
        return;
    }
    let repo = memento.get(varName) || {
        globals: {},
        guest: {},
        users: {},
    };
    for (let p in repo) {
        repo[p] = repo[p] || {};
    }
    return repo;
}
exports.getStateRepository = getStateRepository;
/**
 * Returns the value from a "parameter" object.
 *
 * @param {Object} params The object.
 * @param {string} name The name of the parameter.
 *
 * @return {string} The value of the parameter (if found).
 */
function getUrlParam(params, name) {
    if (params) {
        name = normalizeString(name);
        for (let p in params) {
            if (normalizeString(p) == name) {
                return toStringSafe(params[p]);
            }
        }
    }
}
exports.getUrlParam = getUrlParam;
/**
 * Checks if data is binary or text content.
 *
 * @param {Buffer} data The data to check.
 *
 * @returns {PromiseLike<boolean>} The promise.
 */
function isBinaryContent(data) {
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);
        if (!data) {
            completed(null);
            return;
        }
        try {
            IsBinaryFile(data, data.length, (err, result) => {
                if (err) {
                    completed(err);
                    return;
                }
                completed(null, toBooleanSafe(result));
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.isBinaryContent = isBinaryContent;
/**
 * Checks if the string representation of a value is empty
 * or contains whitespaces only.
 *
 * @param {any} val The value to check.
 *
 * @return {boolean} Is empty or not.
 */
function isEmptyString(val) {
    return '' === toStringSafe(val).trim();
}
exports.isEmptyString = isEmptyString;
/**
 * Checks if a value is (null) or (undefined).
 *
 * @param {any} val The value to check.
 *
 * @return {boolean} Is (null)/(undefined) or not.
 */
function isNullOrUndefined(val) {
    return null === val ||
        'undefined' === typeof val;
}
exports.isNullOrUndefined = isNullOrUndefined;
/**
 * Loads a module.
 *
 * @param {string} file The path of the module's file.
 * @param {boolean} useCache Use cache or not.
 *
 * @return {TModule} The loaded module.
 */
function loadModuleSync(file, useCache = false) {
    if (!Path.isAbsolute(file)) {
        file = Path.join(rapi_workspace.getRootPath(), file);
    }
    file = Path.resolve(file);
    let stats = FS.lstatSync(file);
    if (!stats.isFile()) {
        throw new Error(i18.t('isNo.file', file));
    }
    if (!useCache) {
        delete require.cache[file]; // remove from cache
    }
    return require(file);
}
exports.loadModuleSync = loadModuleSync;
/**
 * Logs a message.
 *
 * @param {any} msg The message to log.
 */
function log(msg) {
    let now = Moment();
    msg = toStringSafe(msg);
    console.log(`[vs-rest-api :: ${now.format('YYYY-MM-DD HH:mm:ss')}] => ${msg}`);
}
exports.log = log;
/**
 * Normalizes a value as string so that is comparable.
 *
 * @param {any} val The value to convert.
 * @param {(str: string) => string} [normalizer] The custom normalizer.
 *
 * @return {string} The normalized value.
 */
function normalizeString(val, normalizer) {
    if (!normalizer) {
        normalizer = (str) => str.toLowerCase().trim();
    }
    return normalizer(toStringSafe(val));
}
exports.normalizeString = normalizeString;
/**
 * Opens a target.
 *
 * @param {string} target The target to open.
 * @param {OpenOptions} [opts] The custom options to set.
 *
 * @param {PromiseLike<ChildProcess.ChildProcess>} The promise.
 */
function open(target, opts) {
    let me = this;
    if (!opts) {
        opts = {};
    }
    opts.wait = toBooleanSafe(opts.wait, true);
    return new Promise((resolve, reject) => {
        let completed = (err, cp) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(cp);
            }
        };
        try {
            if (typeof target !== 'string') {
                throw new Error('Expected a `target`');
            }
            let cmd;
            let appArgs = [];
            let args = [];
            let cpOpts = {
                cwd: opts.cwd || rapi_workspace.getRootPath(),
            };
            if (Array.isArray(opts.app)) {
                appArgs = opts.app.slice(1);
                opts.app = opts.app[0];
            }
            if (process.platform === 'darwin') {
                // Apple
                cmd = 'open';
                if (opts.wait) {
                    args.push('-W');
                }
                if (opts.app) {
                    args.push('-a', opts.app);
                }
            }
            else if (process.platform === 'win32') {
                // Microsoft
                cmd = 'cmd';
                args.push('/c', 'start', '""');
                target = target.replace(/&/g, '^&');
                if (opts.wait) {
                    args.push('/wait');
                }
                if (opts.app) {
                    args.push(opts.app);
                }
                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }
            }
            else {
                // Unix / Linux
                if (opts.app) {
                    cmd = opts.app;
                }
                else {
                    cmd = Path.join(__dirname, 'xdg-open');
                }
                if (appArgs.length > 0) {
                    args = args.concat(appArgs);
                }
                if (!opts.wait) {
                    // xdg-open will block the process unless
                    // stdio is ignored even if it's unref'd
                    cpOpts.stdio = 'ignore';
                }
            }
            args.push(target);
            if (process.platform === 'darwin' && appArgs.length > 0) {
                args.push('--args');
                args = args.concat(appArgs);
            }
            let cp = ChildProcess.spawn(cmd, args, cpOpts);
            if (opts.wait) {
                cp.once('error', (err) => {
                    completed(err);
                });
                cp.once('close', function (code) {
                    if (code > 0) {
                        completed(new Error('Exited with code ' + code));
                        return;
                    }
                    completed(null, cp);
                });
            }
            else {
                cp.unref();
                completed(null, cp);
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.open = open;
/**
 * Opens a HTML document in a new tab for a document storage.
 *
 * @param {rapi_contracts.Document[]} storage The storage to open for.
 * @param {string} html The HTML document (source code).
 * @param {string} [title] The custom title for the tab.
 * @param {any} [id] The custom ID for the document in the storage.
 *
 * @returns {Promise<any>} The promise.
 */
function openHtmlDocument(storage, html, title, id) {
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);
        try {
            let body;
            let enc = 'utf8';
            if (html) {
                body = new Buffer(toStringSafe(html), enc);
            }
            if (isNullOrUndefined(id)) {
                id = 'vsraGlobalHtmlDocs::302b46ff-1539-48fd-893e-d7b83d763f93::' + (++nextHtmlDocId);
            }
            let doc = {
                body: body,
                encoding: enc,
                id: id,
                mime: 'text/html',
            };
            if (!isEmptyString(title)) {
                doc.title = toStringSafe(title).trim();
            }
            if (storage) {
                storage.push(doc);
            }
            vscode.commands.executeCommand('extension.restApi.openHtmlDoc', doc).then((result) => {
                completed(null, result);
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.openHtmlDocument = openHtmlDocument;
/**
 * Reads the content of the HTTP request body.
 *
 * @param {HTTP.IncomingMessag} msg The HTTP message with the body.
 *
 * @returns {Promise<Buffer>} The promise.
 */
function readHttpBody(msg) {
    return new Promise((resolve, reject) => {
        let buff;
        let completedInvoked = false;
        let dataListener;
        let completed = (err) => {
            if (completedInvoked) {
                return;
            }
            completedInvoked = true;
            if (dataListener) {
                try {
                    msg.removeListener('data', dataListener);
                }
                catch (e) {
                    log(i18.t('errors.withCategory', 'helpers.readHttpBody()', e));
                }
            }
            if (err) {
                reject(err);
            }
            else {
                resolve(buff);
            }
        };
        dataListener = (chunk) => {
            try {
                if (chunk && chunk.length > 0) {
                    if ('string' === typeof chunk) {
                        chunk = new Buffer(chunk);
                    }
                    buff = Buffer.concat([buff, chunk]);
                }
            }
            catch (e) {
                completed(e);
            }
        };
        try {
            buff = Buffer.alloc(0);
            msg.once('error', (err) => {
                if (err) {
                    completed(err);
                }
            });
            msg.on('data', dataListener);
            msg.once('end', () => {
                resolve(buff);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.readHttpBody = readHttpBody;
/**
 * Reads the content of the HTTP request body and returns it as parsed object.
 *
 * @param {HTTP.IncomingMessag} msg The HTTP message with the body.
 * @param {string} encoding The custom text encoding to use.
 *
 * @returns {PromiseLike<T>} The promise.
 */
function readHttpBodyAsJSON(msg, encoding) {
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);
        readHttpBodyAsString(msg, encoding).then((str) => {
            try {
                let obj;
                if (str && str.length > 0) {
                    obj = JSON.parse(str);
                }
                completed(null, obj);
            }
            catch (e) {
                completed(e);
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.readHttpBodyAsJSON = readHttpBodyAsJSON;
/**
 * Reads the content of the HTTP request body and returns it as string.
 *
 * @param {HTTP.IncomingMessag} msg The HTTP message with the body.
 * @param {string} encoding The custom text encoding to use.
 *
 * @returns {PromiseLike<string>} The promise.
 */
function readHttpBodyAsString(msg, encoding) {
    encoding = normalizeString(encoding);
    if (!encoding) {
        encoding = 'utf8';
    }
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);
        readHttpBody(msg).then((body) => {
            try {
                completed(null, !isNullOrUndefined(body) ? body.toString(encoding) : body);
            }
            catch (e) {
                completed(e);
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.readHttpBodyAsString = readHttpBodyAsString;
/**
 * Removes documents from a storage.
 *
 * @param {rapi_contracts.Document|rapi_contracts.Document[]} docs The document(s) to remove.
 * @param {rapi_contracts.Document[]} storage The storage.
 *
 * @return {rapi_contracts.Document[]} The removed documents.
 */
function removeDocuments(docs, storage) {
    let ids = asArray(docs).filter(x => x)
        .map(x => x.id);
    let removed = [];
    if (storage) {
        for (let i = 0; i < storage.length;) {
            let d = storage[i];
            if (ids.indexOf(d.id) > -1) {
                removed.push(d);
                storage.splice(i, 1);
            }
            else {
                ++i;
            }
        }
    }
    return removed;
}
exports.removeDocuments = removeDocuments;
/**
 * Replaces all occurrences of a string.
 *
 * @param {string} str The input string.
 * @param {string} searchValue The value to search for.
 * @param {string} replaceValue The value to replace 'searchValue' with.
 *
 * @return {string} The output string.
 */
function replaceAllStrings(str, searchValue, replaceValue) {
    str = toStringSafe(str);
    searchValue = toStringSafe(searchValue);
    replaceValue = toStringSafe(replaceValue);
    return str.split(searchValue)
        .join(replaceValue);
}
exports.replaceAllStrings = replaceAllStrings;
/**
 * Loads a module from the extension context.
 *
 * @param {string} id The ID / path of the module.
 *
 * @return {any} The loaded module.
 */
function requireModule(id) {
    return require(toStringSafe(id));
}
exports.requireModule = requireModule;
/**
 * Sets the content of a text editor.
 *
 * @param {vscode.TextEditor} editor The text editor.
 * @param {string} value The new value.
 *
 * @param {PromiseLike<vscode.TextDocument>} The promise.
 */
function setContentOfTextEditor(editor, value) {
    value = toStringSafe(value);
    return new Promise((resolve, reject) => {
        let completed = createSimplePromiseCompletedAction(resolve, reject);
        try {
            editor.edit((builder) => {
                try {
                    let doc = editor.document;
                    if (doc) {
                        let r = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(doc.lineCount, 0));
                        builder.replace(r, value);
                    }
                    completed(null, editor.document);
                }
                catch (e) {
                    completed(e);
                }
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.setContentOfTextEditor = setContentOfTextEditor;
/**
 * Converts a text document to a result object.
 *
 * @param {vscode.TextDocument} doc The document to convert.
 * @param {rapi_contracts.User} user The user that wants to access the document.
 *
 * @returns {PromiseLike<Object|false>} The promise.
 */
function textDocumentToObject(doc, user) {
    return new Promise((resolve, reject) => {
        let obj;
        let completed = (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(obj);
            }
        };
        try {
            if (doc) {
                let fileName = doc.fileName;
                let filePath;
                let fullPath = fileName;
                let openPath;
                let mime;
                let createObjectAndReturn = () => {
                    obj = {
                        content: doc.getText(),
                        file: {
                            mime: mime,
                            name: fileName,
                            path: filePath,
                        },
                        isDirty: doc.isDirty,
                        isUntitled: doc.isUntitled,
                        lang: doc.languageId,
                        lines: doc.lineCount,
                        openPath: openPath,
                    };
                    completed();
                };
                if (doc.isUntitled) {
                    createObjectAndReturn();
                }
                else {
                    let relativePath = toRelativePath(fileName);
                    fileName = Path.basename(fileName);
                    mime = detectMimeByFilename(fullPath);
                    if (false !== relativePath) {
                        user.isFileVisible(fullPath, user.get(rapi_host_users.VAR_WITH_DOT)).then((isVisible) => {
                            if (isVisible) {
                                filePath = toStringSafe(relativePath);
                                filePath = replaceAllStrings(filePath, "\\", '/');
                                filePath = replaceAllStrings(filePath, Path.sep, '/');
                                let filePathSuffix = filePath.split('/')
                                    .map(x => encodeURIComponent(x))
                                    .join('/');
                                filePath = '/api/workspace' + filePathSuffix;
                                openPath = '/api/editor' + filePathSuffix;
                                createObjectAndReturn();
                            }
                            else {
                                // not visible
                                obj = false;
                                completed();
                            }
                        }, (err) => {
                            completed(err);
                        });
                    }
                    else {
                        // do not submit path data of opened file
                        // because it is not part of the workspace
                        createObjectAndReturn();
                    }
                }
            }
            else {
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.textDocumentToObject = textDocumentToObject;
/**
 * Converts a value to a boolean.
 *
 * @param {any} val The value to convert.
 * @param {any} defaultValue The value to return if 'val' is (null) or (undefined).
 *
 * @return {boolean} The converted value.
 */
function toBooleanSafe(val, defaultValue = false) {
    if (isNullOrUndefined(val)) {
        return defaultValue;
    }
    return !!val;
}
exports.toBooleanSafe = toBooleanSafe;
/**
 * Tries to convert a file path to a relative path.
 *
 * @param {string} path The path to convert.
 * @param {string} [baseDir] The custom base / root directory to use.
 *
 * @return {string | false} The relative path or (false) if not possible.
 */
function toRelativePath(path, baseDir) {
    let result = false;
    if (isEmptyString(baseDir)) {
        baseDir = rapi_workspace.getRootPath();
    }
    else {
        if (!Path.isAbsolute(baseDir)) {
            baseDir = Path.join(rapi_workspace.getRootPath(), baseDir);
        }
        baseDir = Path.resolve(baseDir);
    }
    try {
        let normalizedPath = replaceAllStrings(path, Path.sep, '/');
        let wsRootPath = replaceAllStrings(rapi_workspace.getRootPath(), Path.sep, '/');
        if (wsRootPath) {
            if (FS.existsSync(wsRootPath)) {
                if (FS.lstatSync(wsRootPath).isDirectory()) {
                    if (0 == normalizedPath.indexOf(wsRootPath)) {
                        result = normalizedPath.substr(wsRootPath.length);
                        result = replaceAllStrings(result, Path.sep, '/');
                    }
                }
            }
        }
    }
    catch (e) {
        log(`[ERROR] helpers.toRelativePath(): ${toStringSafe(e)}`);
    }
    return result;
}
exports.toRelativePath = toRelativePath;
/**
 * Converts a value to a string that is NOT (null) or (undefined).
 *
 * @param {any} str The input value.
 * @param {any} defValue The default value.
 *
 * @return {string} The output value.
 */
function toStringSafe(str, defValue = '') {
    if (isNullOrUndefined(str)) {
        str = '';
    }
    str = '' + str;
    if (!str) {
        str = defValue;
    }
    return str;
}
exports.toStringSafe = toStringSafe;
/**
 * Keeps sure to return a "validator" that is NOT (null) or (undefined).
 *
 * @param {rapi_contracts.Validator<T>} validator The input value.
 *
 * @return {rapi_contracts.Validator<T>} The output value.
 */
function toValidatorSafe(validator) {
    if (!validator) {
        // use "dummy" validator
        validator = () => {
            return true;
        };
    }
    return validator;
}
exports.toValidatorSafe = toValidatorSafe;
/**
 * Tries to dispose an object.
 *
 * @param {vscode.Disposable} obj The object to dispose.
 *
 * @return {boolean} Operation was successful or not.
 */
function tryDispose(obj) {
    try {
        if (obj) {
            obj.dispose();
        }
        return true;
    }
    catch (e) {
        log(`[ERROR] helpers.tryDispose(): ${toStringSafe(e)}`);
        return false;
    }
}
exports.tryDispose = tryDispose;
/**
 * Extracts the query parameters of an URI to an object.
 *
 * @param {vscode.Uri} uri The URI.
 *
 * @return {Object} The parameters of the URI as object.
 */
function uriParamsToObject(uri) {
    if (!uri) {
        return uri;
    }
    let params;
    if (!isEmptyString(uri.query)) {
        // s. https://css-tricks.com/snippets/jquery/get-query-params-object/
        params = uri.query.replace(/(^\?)/, '')
            .split("&")
            .map(function (n) {
            return n = n.split("="), this[normalizeString(n[0])] =
                toStringSafe(decodeURIComponent(n[1])), this;
        }
            .bind({}))[0];
    }
    if (!params) {
        params = {};
    }
    return params;
}
exports.uriParamsToObject = uriParamsToObject;
//# sourceMappingURL=helpers.js.map