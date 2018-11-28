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
const FS = require("fs");
const HTTP = require("http");
const HTTPs = require("https");
const i18 = require("./i18");
const Moment = require("moment");
const OS = require("os");
const Path = require("path");
const rapi_contracts = require("./contracts");
const rapi_helpers = require("./helpers");
const rapi_hooks = require("./hooks");
const rapi_host_helpers = require("./host/helpers");
const rapi_users = require("./host/users");
const rapi_workspace = require("./workspace");
const URL = require("url");
const vscode = require("vscode");
/**
 * The default text encoding.
 */
exports.DEFAULT_ENCODING = 'utf8';
/**
 * The default port for the workspace host.
 */
exports.DEFAULT_PORT = 1781;
/**
 * Checks if URL path represents an API request.
 */
exports.REGEX_API = /^(\/)(api)(\/)?/i;
/**
 * A HTTP for browsing the workspace.
 */
class ApiHost {
    /**
     * Initializes a new instance of that class.
     *
     * @param {rapi_controller.Controller} controller The underlying controller.
     */
    constructor(controller) {
        /**
         * Stores the permanent state values of API endpoint script states.
         */
        this._API_ENDPOINT_SCRIPT_STATES = {};
        /**
         * Stores an object that shares data between all API endpoint scripts.
         */
        this._API_ENDPOINT_STATE = {};
        /**
         * Stores the permanent state values of validator script states.
         */
        this._VALIDATOR_SCRIPT_STATES = {};
        /**
         * Stores an object that shares data between all validator scripts.
         */
        this._VALIDATOR_STATE = {};
        this._CONTROLLER = controller;
    }
    /**
     * Gets the underlying controller.
     */
    get controller() {
        return this._CONTROLLER;
    }
    /** @inheritdoc */
    dispose() {
        let me = this;
        me.stop().then(() => {
            //TODO
        }, (err) => {
            me.controller.log(i18.t('errors.withCategory', 'ApiHost.dispose()', err));
        });
    }
    /**
     * Handles an API call.
     *
     * @param {rapi_contracts.RequestContext} ctx The request context.
     * @param {ApiResponse} response The predefined response data.
     */
    handleApi(ctx, response) {
        let me = this;
        try {
            let apiModule;
            let method;
            let customOnly = rapi_helpers.toBooleanSafe(ctx.user.account.customOnly, rapi_helpers.toBooleanSafe(ctx.config.customOnly));
            let normalizedPath = rapi_helpers.toStringSafe(ctx.url.pathname);
            normalizedPath = rapi_helpers.replaceAllStrings(normalizedPath, "\\", '/');
            normalizedPath = rapi_helpers.replaceAllStrings(normalizedPath, Path.sep, '/');
            normalizedPath = rapi_helpers.normalizeString(normalizedPath);
            let parts = normalizedPath.substr(4)
                .split('/')
                .map(x => decodeURIComponent(x))
                .filter(x => !rapi_helpers.isEmptyString(x));
            let apiArgs;
            apiArgs = {
                deploy: (files, targets) => {
                    // files
                    files = rapi_helpers.asArray(files)
                        .map(x => rapi_helpers.toStringSafe(x))
                        .filter(x => !rapi_helpers.isEmptyString(x));
                    files = rapi_helpers.distinctArray(files);
                    // targets
                    targets = rapi_helpers.asArray(targets)
                        .map(x => rapi_helpers.normalizeString(x))
                        .filter(x => x);
                    targets = rapi_helpers.distinctArray(targets);
                    return new Promise((resolve, reject) => {
                        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
                        try {
                            vscode.commands.executeCommand('extension.deploy.filesTo', files, targets).then((result) => {
                                completed(null, result);
                            }, (err) => {
                                completed(err);
                            });
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                },
                doNotEmitHook: false,
                emitHook: function (hook, args) {
                    hook = rapi_helpers.normalizeString(hook);
                    if (!hook) {
                        hook = '.' + ctx.method;
                        if (parts.length > 0) {
                            hook = parts[0].trim() + hook;
                        }
                    }
                    return rapi_hooks.emitHooks(apiArgs, hook, args);
                },
                encoding: exports.DEFAULT_ENCODING,
                endpoint: {
                    arguments: undefined,
                    isRoot: undefined,
                    name: undefined,
                },
                executeBuildIn: function (endpoint, args) {
                    args = args || apiArgs;
                    return new Promise((resolve, reject) => {
                        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
                        try {
                            endpoint = rapi_helpers.normalizeString(endpoint);
                            if (!endpoint) {
                                // try use default
                                if (parts.length > 0) {
                                    endpoint = rapi_helpers.normalizeString(parts[0]);
                                }
                            }
                            let buildInMethod;
                            if (endpoint) {
                                try {
                                    let buildInModule = require('./api/' + endpoint);
                                    if (buildInModule) {
                                        let upperMethod = ctx.method.toUpperCase();
                                        for (let p in buildInModule) {
                                            if (p == upperMethod) {
                                                if ('function' === typeof buildInModule[p]) {
                                                    // found
                                                    buildInMethod = buildInModule[p];
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                catch (e) { }
                            }
                            if (buildInMethod) {
                                let buildInMethodResult = buildInMethod(args);
                                if (buildInMethodResult) {
                                    // Promise => async
                                    buildInMethodResult.then((r) => {
                                        completed(null, r);
                                    }, (err) => {
                                        completed(err);
                                    });
                                }
                                else {
                                    completed();
                                }
                            }
                            else {
                                args.sendMethodNotAllowed();
                                completed();
                            }
                        }
                        catch (e) {
                            completed(e);
                        }
                    });
                },
                extension: me.controller.context,
                getBody: function () {
                    return rapi_helpers.readHttpBody(this.request.request);
                },
                getJSON: function () {
                    let enc = this.encoding;
                    if (arguments.length > 0) {
                        enc = arguments[0];
                    }
                    return rapi_helpers.readHttpBodyAsJSON(this.request.request, enc);
                },
                getString: function () {
                    let enc = this.encoding;
                    if (arguments.length > 0) {
                        enc = arguments[0];
                    }
                    return rapi_helpers.readHttpBodyAsString(this.request.request, enc);
                },
                globals: me.controller.getGlobals(),
                globalState: undefined,
                headers: {
                    'Content-type': 'application/json; charset=utf-8',
                },
                log: function (msg) {
                    me.controller.log(msg);
                    return this;
                },
                openHtml: function (html, title, docId) {
                    return rapi_helpers.openHtmlDocument(this.workspaceState[rapi_contracts.VAR_HTML_DOCS], html, title, docId);
                },
                options: undefined,
                outputChannel: me.controller.outputChannel,
                package: rapi_helpers.cloneObject(me.controller.packageFile),
                parameters: undefined,
                path: parts.join('/'),
                request: ctx,
                require: function (id) {
                    return rapi_helpers.requireModule(id);
                },
                response: response,
                setContent: function (newContent, mime) {
                    delete this.response;
                    this.content = newContent;
                    mime = rapi_helpers.normalizeString(mime);
                    if (mime) {
                        if (!this.headers) {
                            this.headers = {};
                        }
                        this.headers['Content-type'] = mime;
                    }
                    return this;
                },
                sendError: function (err) {
                    this.statusCode = 500;
                    delete this.response;
                    delete this.headers;
                    return this;
                },
                sendForbidden: function () {
                    this.statusCode = 403;
                    delete this.response;
                    delete this.headers;
                    return this;
                },
                sendMethodNotAllowed: function () {
                    this.statusCode = 405;
                    delete this.response;
                    delete this.headers;
                    return this;
                },
                sendNotFound: function () {
                    this.statusCode = 404;
                    delete this.response;
                    delete this.headers;
                    return this;
                },
                sendResponse: function (code) {
                    this.statusCode = code;
                    delete this.response;
                    delete this.headers;
                    return this;
                },
                state: undefined,
                statusCode: 200,
                url: undefined,
                whiteboard: undefined,
                workspaceState: undefined,
                write: function (data) {
                    if (!data) {
                        return;
                    }
                    let enc = rapi_helpers.normalizeString(this.encoding);
                    if (!enc) {
                        enc = exports.DEFAULT_ENCODING;
                    }
                    this.request
                        .response.write(rapi_helpers.asBuffer(data), enc);
                    return this;
                }
            };
            // apiArgs.globalState
            Object.defineProperty(apiArgs, 'globalState', {
                enumerable: true,
                get: () => {
                    return me._API_ENDPOINT_STATE;
                }
            });
            // apiArgs.parameters
            Object.defineProperty(apiArgs, 'parameters', {
                enumerable: true,
                get: () => {
                    return rapi_host_helpers.urlParamsToObject(ctx.url);
                }
            });
            // apiArgs.url
            Object.defineProperty(apiArgs, 'url', {
                enumerable: true,
                get: () => {
                    return ctx.url;
                }
            });
            // apiArgs.whiteboard
            Object.defineProperty(apiArgs, 'whiteboard', {
                enumerable: true,
                get: () => {
                    return ctx.whiteboard;
                }
            });
            // apiArgs.workspaceState
            Object.defineProperty(apiArgs, 'workspaceState', {
                enumerable: true,
                get: () => {
                    return me.controller.workspaceState;
                }
            });
            // apiArgs.endpoint.*
            {
                // apiArgs.endpoint.arguments
                Object.defineProperty(apiArgs.endpoint, 'arguments', {
                    enumerable: true,
                    get: function () {
                        return parts.filter((x, i) => i > 0);
                    }
                });
                // apiArgs.endpoint.isRoot
                Object.defineProperty(apiArgs.endpoint, 'isRoot', {
                    enumerable: true,
                    get: function () {
                        return rapi_helpers.isEmptyString(this.name);
                    }
                });
                // apiArgs.endpoint.name
                Object.defineProperty(apiArgs.endpoint, 'name', {
                    enumerable: true,
                    get: function () {
                        return parts.length > 0 ? rapi_helpers.normalizeString(parts[0])
                            : null;
                    }
                });
            }
            // check for user specific endpoints
            let accountEP;
            let isAvaiableForUser = true;
            if (!rapi_helpers.isEmptyString(apiArgs.path)) {
                // no root
                if (ctx.user.account.endpoints) {
                    isAvaiableForUser = false; // here we are in "whitelist" mode
                    for (let pattern in ctx.user.account.endpoints) {
                        let isMatching = true;
                        if (pattern) {
                            let regex = new RegExp(rapi_helpers.toStringSafe(pattern), 'i');
                            isMatching = regex.test(apiArgs.path);
                        }
                        if (!isMatching) {
                            continue;
                        }
                        let ep = ctx.user.account.endpoints[pattern];
                        if (!ep) {
                            ep = {};
                        }
                        isAvaiableForUser = rapi_helpers.toBooleanSafe(ep.isAvailable, true);
                        if (isAvaiableForUser) {
                            accountEP = ep; // found
                            break;
                        }
                    }
                }
            }
            if (!isAvaiableForUser) {
                rapi_host_helpers.sendNotFound(ctx);
                return;
            }
            // check for HTTP methods?
            if (accountEP) {
                let allowedMethods = rapi_helpers.asArray(accountEP.methods)
                    .map(x => rapi_helpers.normalizeString(x))
                    .filter(x => x);
                if (allowedMethods.length > 0) {
                    // defined, so do check...
                    if (allowedMethods.indexOf(ctx.method) < 0) {
                        // not alllowed
                        rapi_host_helpers.sendMethodNotAllowed(ctx);
                        return;
                    }
                }
            }
            // search for a matching external API module
            if (ctx.config.endpoints) {
                for (let pattern in ctx.config.endpoints) {
                    let ep = ctx.config.endpoints[pattern];
                    if (!ep) {
                        continue;
                    }
                    if (!rapi_helpers.toBooleanSafe(ep.isActive, true)) {
                        continue; // not active
                    }
                    let isMatching = true;
                    if (pattern) {
                        let regex = new RegExp(rapi_helpers.toStringSafe(pattern), 'i');
                        isMatching = regex.test(apiArgs.path);
                    }
                    if (isMatching) {
                        // found
                        apiArgs.options = ep.options;
                        let apiScript = rapi_helpers.toStringSafe(ep.script);
                        if (!rapi_helpers.isEmptyString(apiScript)) {
                            if (!Path.isAbsolute(apiScript)) {
                                apiScript = Path.join(rapi_workspace.getRootPath(), apiScript);
                            }
                            apiScript = Path.resolve(apiScript);
                            apiModule = rapi_helpers.loadModuleSync(apiScript);
                            // apiArgs.state
                            Object.defineProperty(apiArgs, 'state', {
                                enumerable: true,
                                get: () => {
                                    return me._API_ENDPOINT_SCRIPT_STATES[apiScript];
                                },
                                set: (newValue) => {
                                    me._API_ENDPOINT_SCRIPT_STATES[apiScript] = newValue;
                                }
                            });
                        }
                        if (!apiModule) {
                            // ... but not implemented
                            rapi_host_helpers.sendNotImplemented(ctx);
                            return;
                        }
                        break;
                    }
                }
            }
            if (apiModule) {
                // custom method from external API module
                method = apiModule[ctx.method.toUpperCase()];
            }
            else if (!customOnly) {
                // no custom method found
                // now try to bind matching "build in" ...
                let isRoot = true;
                if (parts.length > 0) {
                    let modName = rapi_helpers.normalizeString(rapi_helpers.cleanupString(parts[0]));
                    if (!rapi_helpers.isEmptyString(modName)) {
                        isRoot = false;
                        // try load module
                        let mod;
                        try {
                            mod = require(`./api/${modName}`);
                        }
                        catch (e) { }
                        if (mod) {
                            // search for function that
                            // has the same name as the HTTP request
                            // method
                            let upperMethod = ctx.method.toUpperCase();
                            for (let p in mod) {
                                if (p == upperMethod) {
                                    if ('function' === typeof mod[p]) {
                                        method = mod[p];
                                    }
                                    break;
                                }
                            }
                            if (!method) {
                                // no matching method found
                                method = (ac) => {
                                    ac.sendMethodNotAllowed();
                                };
                            }
                        }
                    }
                }
                if (isRoot) {
                    // root
                    method = (ac) => {
                        ac.response.data = {
                            addr: ctx.request.connection.remoteAddress,
                            endpoints: {},
                            time: ctx.time.format('YYYY-MM-DD HH:mm:ss'),
                        };
                        // endpoints
                        {
                            let endpoints = ac.response.data['endpoints'];
                            let isEndpointAvailableForUser = (endpointName, httpMethod, acl) => {
                                acl = rapi_helpers.asArray(acl)
                                    .filter(x => rapi_helpers.normalizeString(x))
                                    .filter(x => x);
                                if (acl.filter(x => ac.request.user.can(x)).length <
                                    acl.length) {
                                    // not all required rights in the ACL
                                    return false;
                                }
                                let isEPAvailable = true;
                                httpMethod = rapi_helpers.normalizeString(httpMethod);
                                if (ctx.user.account.endpoints) {
                                    isEPAvailable = false;
                                    for (let pattern in ctx.user.account.endpoints) {
                                        let isMatching = true;
                                        if (pattern) {
                                            let regex = new RegExp(rapi_helpers.toStringSafe(pattern), 'i');
                                            isMatching = regex.test(endpointName);
                                        }
                                        if (!isMatching) {
                                            continue; // pattern does not match
                                        }
                                        let ep = ctx.user.account.endpoints[pattern];
                                        if (!ep) {
                                            ep = {};
                                        }
                                        isEPAvailable = rapi_helpers.toBooleanSafe(ep.isAvailable, true);
                                        if (isEPAvailable) {
                                            // check HTTP methods
                                            let allowedEPMethods = rapi_helpers.asArray(ep.methods)
                                                .map(x => rapi_helpers.normalizeString(x))
                                                .filter(x => x);
                                            if (allowedEPMethods.length > 0) {
                                                isEPAvailable = allowedEPMethods.indexOf(httpMethod) > -1;
                                            }
                                        }
                                        if (isEPAvailable) {
                                            break;
                                        }
                                    }
                                }
                                return isEPAvailable;
                            };
                            let setEndpointDescription = (category, httpMethod, path) => {
                                if (!endpoints[category]) {
                                    endpoints[category] = {};
                                }
                                endpoints[category][httpMethod] = '/api/' + path;
                            };
                            // commands
                            {
                                if (isEndpointAvailableForUser('commands', 'get', 'execute')) {
                                    setEndpointDescription('commands', 'get', 'commands');
                                }
                                if (isEndpointAvailableForUser('commands', 'post', 'execute')) {
                                    setEndpointDescription('commands', 'post', 'commands/{commandId}');
                                }
                            }
                            // active editor
                            {
                                if (isEndpointAvailableForUser('editor', 'get')) {
                                    setEndpointDescription('active_editor', 'get', 'editor');
                                }
                                if (isEndpointAvailableForUser('editor', 'delete', 'close')) {
                                    setEndpointDescription('active_editor', 'delete', 'editor');
                                }
                                if (isEndpointAvailableForUser('editor', 'patch', 'write')) {
                                    setEndpointDescription('active_editor', 'patch', 'editor');
                                }
                                if (isEndpointAvailableForUser('editor', 'post', 'open')) {
                                    setEndpointDescription('active_editor', 'post', 'editor(/{file})');
                                }
                                if (isEndpointAvailableForUser('editor', 'put', 'write')) {
                                    setEndpointDescription('active_editor', 'put', 'editor');
                                }
                            }
                            // app globals
                            {
                                if (isEndpointAvailableForUser('appglobals', 'get')) {
                                    setEndpointDescription('app_globals', 'get', 'appglobals');
                                }
                                if (isEndpointAvailableForUser('appglobals', 'delete', 'delete')) {
                                    setEndpointDescription('app_globals', 'delete', 'appglobals/{name}');
                                }
                                if (isEndpointAvailableForUser('appglobals', 'put', 'write')) {
                                    setEndpointDescription('app_globals', 'put', 'appglobals/{name}');
                                }
                            }
                            // app state
                            {
                                if (isEndpointAvailableForUser('appstate', 'get')) {
                                    setEndpointDescription('app_state', 'get', 'appstate');
                                }
                                if (isEndpointAvailableForUser('appstate', 'delete', 'delete')) {
                                    setEndpointDescription('app_state', 'delete', 'appstate/{name}');
                                }
                                if (isEndpointAvailableForUser('appstate', 'put', 'write')) {
                                    setEndpointDescription('app_state', 'put', 'appstate/{name}');
                                }
                            }
                            // open editor
                            {
                                if (isEndpointAvailableForUser('editors', 'get')) {
                                    setEndpointDescription('open_editors', 'get', 'editors');
                                }
                                if (isEndpointAvailableForUser('editors', 'delete', 'delete')) {
                                    setEndpointDescription('open_editors', 'delete', 'editors(/{id})');
                                }
                                if (isEndpointAvailableForUser('editors', 'patch', 'write')) {
                                    setEndpointDescription('open_editors', 'patch', 'editors(/{id})');
                                }
                                if (isEndpointAvailableForUser('editors', 'post', 'open')) {
                                    setEndpointDescription('open_editors', 'post', 'editors(/{id})');
                                }
                                if (isEndpointAvailableForUser('editors', 'put', 'write')) {
                                    setEndpointDescription('open_editors', 'put', 'editors(/{id})');
                                }
                            }
                            // extensions
                            {
                                if (isEndpointAvailableForUser('extensions', 'get')) {
                                    setEndpointDescription('extensions', 'get', 'extensions');
                                }
                                if (isEndpointAvailableForUser('extensions', 'post', 'activate')) {
                                    setEndpointDescription('extensions', 'post', 'extensions/{id}');
                                }
                            }
                            // globals
                            {
                                if (isEndpointAvailableForUser('globals', 'get')) {
                                    setEndpointDescription('globals', 'get', 'globals');
                                }
                                if (isEndpointAvailableForUser('globals', 'delete', 'delete')) {
                                    setEndpointDescription('globals', 'delete', 'globals/{name}');
                                }
                                if (isEndpointAvailableForUser('globals', 'put', 'write')) {
                                    setEndpointDescription('globals', 'put', 'globals/{name}');
                                }
                            }
                            // languages
                            {
                                if (isEndpointAvailableForUser('languages', 'get')) {
                                    setEndpointDescription('languages', 'get', 'languages');
                                }
                            }
                            // output channels
                            {
                                if (isEndpointAvailableForUser('outputs', 'get')) {
                                    setEndpointDescription('outputs', 'get', 'outputs');
                                }
                                if (isEndpointAvailableForUser('outputs', 'delete', 'delete')) {
                                    setEndpointDescription('outputs', 'delete', 'outputs/{id}');
                                }
                                if (isEndpointAvailableForUser('outputs', 'post', 'create')) {
                                    setEndpointDescription('outputs', 'post', 'outputs/{name}');
                                }
                                if (isEndpointAvailableForUser('outputs', 'patch', 'write')) {
                                    setEndpointDescription('outputs', 'patch', 'outputs/{id}');
                                }
                                if (isEndpointAvailableForUser('outputs', 'put', 'write')) {
                                    setEndpointDescription('outputs', 'put', 'outputs/{id}');
                                }
                            }
                            // state
                            {
                                if (isEndpointAvailableForUser('state', 'get')) {
                                    setEndpointDescription('state', 'get', 'state');
                                }
                                if (isEndpointAvailableForUser('state', 'delete', 'delete')) {
                                    setEndpointDescription('state', 'delete', 'state/{name}');
                                }
                                if (isEndpointAvailableForUser('state', 'put', 'write')) {
                                    setEndpointDescription('state', 'put', 'state/{name}');
                                }
                            }
                            // workspace
                            {
                                if (isEndpointAvailableForUser('workspace', 'get')) {
                                    setEndpointDescription('workspace', 'get', 'workspace(/{path})');
                                }
                                if (isEndpointAvailableForUser('workspace', 'delete', 'delete')) {
                                    setEndpointDescription('workspace', 'delete', 'workspace/{path}');
                                }
                                if (isEndpointAvailableForUser('workspace', 'patch', 'write')) {
                                    setEndpointDescription('workspace', 'patch', 'workspace/{path}');
                                }
                                if (isEndpointAvailableForUser('workspace', 'post', 'write')) {
                                    setEndpointDescription('workspace', 'post', 'workspace/{path}');
                                }
                                if (isEndpointAvailableForUser('workspace', 'put', 'write')) {
                                    setEndpointDescription('workspace', 'put', 'workspace/{path}');
                                }
                            }
                            // popups
                            {
                                if (isEndpointAvailableForUser('popups', 'post', 'execute')) {
                                    setEndpointDescription('popups', 'post', 'popups');
                                }
                            }
                            // html
                            {
                                if (isEndpointAvailableForUser('html', 'post', 'open')) {
                                    setEndpointDescription('html', 'post', 'html');
                                }
                            }
                            // deploy
                            {
                                if (isEndpointAvailableForUser('deploy', 'get', 'deploy')) {
                                    setEndpointDescription('deploy', 'get', 'deploy');
                                }
                                if (isEndpointAvailableForUser('deploy', 'post', 'deploy')) {
                                    setEndpointDescription('deploy', 'post', 'deploy/{file}');
                                }
                            }
                            // cron
                            {
                                if (isEndpointAvailableForUser('cron', 'get')) {
                                    setEndpointDescription('cron', 'get', 'cron');
                                }
                                if (isEndpointAvailableForUser('cron', 'delete', 'activate')) {
                                    setEndpointDescription('cron', 'delete', 'cron(/{name})');
                                }
                                if (isEndpointAvailableForUser('cron', 'post', 'activate')) {
                                    setEndpointDescription('cron', 'post', 'cron(/{name})');
                                }
                                if (isEndpointAvailableForUser('cron', 'put', 'activate')) {
                                    setEndpointDescription('cron', 'put', 'cron(/{name})');
                                }
                            }
                            // whiteboard
                            if (ctx.whiteboard) {
                                if (isEndpointAvailableForUser('whiteboard', 'get')) {
                                    setEndpointDescription('whiteboard', 'get', 'whiteboard(/{revision})');
                                }
                                if (isEndpointAvailableForUser('whiteboard', 'delete', 'delete')) {
                                    setEndpointDescription('whiteboard', 'delete', 'whiteboard');
                                }
                                if (isEndpointAvailableForUser('whiteboard', 'post', ['delete', 'write'])) {
                                    setEndpointDescription('whiteboard', 'post', 'whiteboard');
                                }
                                if (isEndpointAvailableForUser('whiteboard', 'put', 'write')) {
                                    setEndpointDescription('whiteboard', 'put', 'whiteboard');
                                }
                            }
                        }
                        if (!ctx.user.isGuest) {
                            ac.response.data.me = {
                                name: rapi_helpers.normalizeString(ctx.user.account['name']),
                            };
                        }
                        // ACL
                        ac.response.data['acl'] = {};
                        ac.response.data.acl['canActivate'] = ctx.user.can('activate');
                        ac.response.data.acl['canClose'] = ctx.user.can('close');
                        ac.response.data.acl['canCreate'] = ctx.user.can('create');
                        ac.response.data.acl['canDelete'] = ctx.user.can('delete');
                        ac.response.data.acl['canExecute'] = ctx.user.can('execute');
                        ac.response.data.acl['canOpen'] = ctx.user.can('open');
                        ac.response.data.acl['canWrite'] = ctx.user.can('write');
                    };
                }
            }
            if (method) {
                let sendResponse = (err) => {
                    if (err) {
                        rapi_host_helpers.sendError(err, ctx);
                    }
                    else {
                        try {
                            let enc = rapi_helpers.normalizeString(apiArgs.encoding);
                            if (!enc) {
                                enc = exports.DEFAULT_ENCODING;
                            }
                            let responseData;
                            if (apiArgs.response) {
                                responseData = JSON.stringify(response);
                            }
                            else {
                                responseData = apiArgs.content;
                            }
                            let sendResponseData = (finalDataToSend) => {
                                try {
                                    let statusCode = apiArgs.statusCode;
                                    if (rapi_helpers.isEmptyString(statusCode)) {
                                        statusCode = 200;
                                    }
                                    else {
                                        statusCode = parseInt(rapi_helpers.normalizeString(apiArgs.statusCode));
                                    }
                                    let headersToSend = apiArgs.headers;
                                    if (!headersToSend) {
                                        headersToSend = {};
                                    }
                                    headersToSend['X-Vscode-Restapi'] = me.controller.packageFile.version;
                                    ctx.response.writeHead(statusCode, headersToSend);
                                    ctx.response.write(rapi_helpers.asBuffer(finalDataToSend));
                                    ctx.response.end();
                                    if (!rapi_helpers.toBooleanSafe(apiArgs.doNotEmitHook)) {
                                        apiArgs.emitHook();
                                    }
                                }
                                catch (e) {
                                    me.controller.log(i18.t('errors.withCategory', 'ApiHost.handleApi.sendResponseData()', e));
                                }
                            };
                            if (rapi_helpers.toBooleanSafe(apiArgs.compress, true)) {
                                rapi_host_helpers.compressForResponse(responseData, ctx, enc).then((compressResult) => {
                                    if (compressResult.contentEncoding) {
                                        if (!apiArgs.headers) {
                                            apiArgs.headers = {};
                                        }
                                        apiArgs.headers['Content-encoding'] = compressResult.contentEncoding;
                                    }
                                    sendResponseData(compressResult.dataToSend);
                                }, (err) => {
                                    me.controller.log(i18.t('errors.withCategory', 'ApiHost.handleApi.compressForResponse()', err));
                                    sendResponseData(responseData);
                                });
                            }
                            else {
                                // no compression
                                sendResponseData(responseData);
                            }
                        }
                        catch (e) {
                            rapi_host_helpers.sendError(e, ctx);
                        }
                    }
                };
                let methodResult = method(apiArgs);
                if (methodResult) {
                    // async / promise call
                    methodResult.then(() => {
                        sendResponse();
                    }, (err) => {
                        rapi_host_helpers.sendError(err, ctx);
                    });
                }
                else {
                    sendResponse();
                }
            }
            else {
                rapi_host_helpers.sendNotFound(ctx);
            }
        }
        catch (e) {
            rapi_host_helpers.sendError(e, ctx);
        }
    }
    /**
     * Handles a request.
     *
     * @param {RequestContext} ctx The request context.
     */
    handleRequest(ctx) {
        let me = this;
        let normalizedPath = rapi_helpers.normalizeString(ctx.url.pathname);
        if (exports.REGEX_API.test(normalizedPath)) {
            // API
            let apiResponse = {
                code: 0,
                env: {
                    app: {
                        name: rapi_helpers.toStringSafe(vscode.env.appName),
                        version: rapi_helpers.toStringSafe(vscode.version),
                    },
                    host: rapi_helpers.normalizeString(OS.hostname()),
                    lang: rapi_helpers.normalizeString(vscode.env.language),
                    machine: rapi_helpers.toStringSafe(vscode.env.machineId),
                    session: rapi_helpers.toStringSafe(vscode.env.sessionId),
                }
            };
            me.handleApi(ctx, apiResponse);
            return;
        }
        rapi_host_helpers.sendNotFound(ctx);
    }
    /**
     * Starts the server.
     *
     * @param {number} [port] The custom TCP port to use.
     *
     * @return PromiseLike<boolean> The promise.
     */
    start(port) {
        if (rapi_helpers.isNullOrUndefined(port)) {
            port = exports.DEFAULT_PORT;
        }
        port = parseInt(rapi_helpers.toStringSafe(port).trim());
        let me = this;
        let cfg = rapi_helpers.cloneObject(me.controller.config);
        let accounts = rapi_helpers.asArray(cfg.users);
        if ('object' === typeof cfg.guest) {
            accounts.push(cfg.guest);
        }
        // init global storages
        accounts.filter(x => x).forEach(x => {
            x.__globals = {};
        });
        return new Promise((resolve, reject) => {
            let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
            try {
                if (me._server) {
                    completed(null, false);
                    return;
                }
                let requestListener = (req, resp) => {
                    try {
                        let url = URL.parse(req.url);
                        let ctx = {
                            client: {
                                address: req.connection.remoteAddress,
                                port: req.connection.remotePort,
                            },
                            config: cfg,
                            GET: rapi_host_helpers.urlParamsToObject(url),
                            method: rapi_helpers.normalizeString(req.method),
                            request: req,
                            response: resp,
                            time: Moment().utc(),
                            url: url,
                            whiteboard: undefined,
                            workspaceState: undefined,
                        };
                        // ctx.whiteboard
                        Object.defineProperty(ctx, 'whiteboard', {
                            enumerable: true,
                            get: () => {
                                return me.controller.whiteboard;
                            }
                        });
                        // ctx.workspaceState
                        Object.defineProperty(ctx, 'workspaceState', {
                            enumerable: true,
                            get: () => {
                                return me.controller.workspaceState;
                            }
                        });
                        if (!ctx.method) {
                            ctx.method = 'get';
                        }
                        rapi_users.getUser(ctx).then((user) => {
                            ctx.user = user;
                            if (!ctx.user) {
                                rapi_host_helpers.sendUnauthorized(ctx);
                                return;
                            }
                            try {
                                let validatorCtx = {
                                    config: ctx.config,
                                    method: ctx.method,
                                    request: req,
                                    response: resp,
                                    statusCode: 404,
                                    time: ctx.time,
                                    user: user,
                                };
                                let validatorArgs = {
                                    context: validatorCtx,
                                    globals: me.controller.getGlobals(),
                                    globalState: undefined,
                                    log: function (msg) {
                                        me.controller.log(msg);
                                        return this;
                                    },
                                    openHtml: (html, title, docId) => {
                                        return rapi_helpers.openHtmlDocument(me.controller.workspaceState[rapi_contracts.VAR_HTML_DOCS], html, title, docId);
                                    },
                                    options: undefined,
                                    require: function (id) {
                                        return rapi_helpers.requireModule(id);
                                    },
                                    state: undefined,
                                    value: ctx.client,
                                    whiteboard: undefined,
                                    workspaceState: undefined,
                                };
                                // validatorArgs.globalState
                                Object.defineProperty(validatorArgs, 'globalState', {
                                    enumerable: true,
                                    get: () => {
                                        return me._VALIDATOR_STATE;
                                    }
                                });
                                // validatorArgs.state
                                Object.defineProperty(validatorArgs, 'state', {
                                    enumerable: true,
                                    get: () => {
                                        return me.controller.workspaceState;
                                    }
                                });
                                // validatorArgs.whiteboard
                                Object.defineProperty(validatorArgs, 'whiteboard', {
                                    enumerable: true,
                                    get: () => {
                                        return ctx.whiteboard;
                                    }
                                });
                                let validator;
                                if (!rapi_helpers.isNullOrUndefined(cfg.validator)) {
                                    let validatorScript;
                                    let initialState;
                                    if ('object' === typeof cfg.validator) {
                                        validatorScript = cfg.validator.script;
                                        validatorArgs.options = cfg.validator.options;
                                        initialState = cfg.validator.state;
                                    }
                                    else {
                                        validatorScript = rapi_helpers.toStringSafe(cfg.validator);
                                    }
                                    if (!rapi_helpers.isEmptyString(validatorScript)) {
                                        if (!Path.isAbsolute(validatorScript)) {
                                            validatorScript = Path.join(rapi_workspace.getRootPath(), validatorScript);
                                        }
                                        validatorScript = Path.resolve(validatorScript);
                                        if ('undefined' === typeof me._VALIDATOR_SCRIPT_STATES[validatorScript]) {
                                            me._VALIDATOR_SCRIPT_STATES[validatorScript] = initialState;
                                        }
                                        let validatorModule = rapi_helpers.loadModuleSync(validatorScript);
                                        if (validatorModule) {
                                            validator = validatorModule.validate;
                                        }
                                        // validatorArgs.state
                                        Object.defineProperty(validatorArgs, 'state', {
                                            enumerable: true,
                                            get: () => {
                                                return me._VALIDATOR_SCRIPT_STATES[validatorScript];
                                            },
                                            set: (newValue) => {
                                                me._VALIDATOR_SCRIPT_STATES[validatorScript] = newValue;
                                            }
                                        });
                                    }
                                }
                                validator = rapi_helpers.toValidatorSafe(validator);
                                let handleTheRequest = (isRequestValid) => {
                                    isRequestValid = rapi_helpers.toBooleanSafe(isRequestValid, true);
                                    if (isRequestValid) {
                                        try {
                                            me.handleRequest(ctx);
                                        }
                                        catch (e) {
                                            rapi_host_helpers.sendError(e, ctx);
                                        }
                                    }
                                    else {
                                        try {
                                            // not valid
                                            let statusCode = validatorArgs.context.statusCode;
                                            if (rapi_helpers.isEmptyString(statusCode)) {
                                                statusCode = '404';
                                            }
                                            statusCode = parseInt(rapi_helpers.normalizeString(statusCode));
                                            ctx.response.statusCode = statusCode;
                                            ctx.response.end();
                                        }
                                        catch (e) {
                                            rapi_helpers.log(i18.t('errors.withCategory', 'ApiHost.start().requestListener()', e));
                                        }
                                    }
                                };
                                let validatorResult = validator(validatorArgs);
                                if (rapi_helpers.isNullOrUndefined(validatorResult)) {
                                    handleTheRequest(true);
                                }
                                else {
                                    if ('object' === typeof validatorResult) {
                                        validatorResult.then((isValid) => {
                                            handleTheRequest(isValid);
                                        }, (err) => {
                                            rapi_host_helpers.sendError(err, ctx);
                                        });
                                    }
                                    else {
                                        handleTheRequest(validatorResult);
                                    }
                                }
                            }
                            catch (e) {
                                rapi_host_helpers.sendError(e, ctx);
                            }
                        }, (err) => {
                            rapi_host_helpers.sendError(err, ctx);
                        });
                    }
                    catch (e) {
                        try {
                            resp.statusCode = 500;
                            resp.end();
                        }
                        catch (e) {
                            me.controller.log(i18.t('errors.withCategory', 'ApiHost.handleApi.HTTP_500', e));
                        }
                    }
                };
                let newServer;
                if (cfg.ssl) {
                    let ca;
                    let cert;
                    let key;
                    let passphrase;
                    if (cfg.ssl.passphrase) {
                        passphrase = rapi_helpers.toStringSafe(cfg.ssl.passphrase);
                    }
                    if (!rapi_helpers.isEmptyString(cfg.ssl.ca)) {
                        let caFile = rapi_helpers.toStringSafe(cfg.ssl.ca);
                        if (!Path.isAbsolute(caFile)) {
                            caFile = Path.join(rapi_workspace.getRootPath(), caFile);
                        }
                        caFile = Path.resolve(caFile);
                        ca = FS.readFileSync(caFile);
                    }
                    if (!rapi_helpers.isEmptyString(cfg.ssl.cert)) {
                        let certFile = rapi_helpers.toStringSafe(cfg.ssl.cert);
                        if (!Path.isAbsolute(certFile)) {
                            certFile = Path.join(rapi_workspace.getRootPath(), certFile);
                        }
                        certFile = Path.resolve(certFile);
                        cert = FS.readFileSync(certFile);
                    }
                    if (!rapi_helpers.isEmptyString(cfg.ssl.key)) {
                        let keyFile = rapi_helpers.toStringSafe(cfg.ssl.key);
                        if (!Path.isAbsolute(keyFile)) {
                            keyFile = Path.join(rapi_workspace.getRootPath(), keyFile);
                        }
                        keyFile = Path.resolve(keyFile);
                        key = FS.readFileSync(keyFile);
                    }
                    newServer = HTTPs.createServer({
                        ca: ca,
                        cert: cert,
                        key: key,
                        passphrase: passphrase,
                        rejectUnauthorized: rapi_helpers.toBooleanSafe(cfg.ssl.rejectUnauthorized, true),
                    }, requestListener);
                }
                else {
                    newServer = HTTP.createServer(requestListener);
                }
                newServer.on('error', (err) => {
                    completed(err || new Error(`Unknown error! Maybe port '${port}' is in use.`));
                });
                newServer.listen(port, function () {
                    me._server = newServer;
                    completed(null, true);
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
    /**
     * Starts the server.
     *
     * @param {number} [port] The custom TCP port to use.
     *
     * @return PromiseLike<boolean> The promise.
     */
    stop() {
        let me = this;
        return new Promise((resolve, reject) => {
            let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
            try {
                let oldServer = me._server;
                if (!oldServer) {
                    completed(null, false);
                    return;
                }
                oldServer.close(function (err) {
                    if (err) {
                        completed(err);
                    }
                    else {
                        me._server = null;
                        completed(null, true);
                    }
                });
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
exports.ApiHost = ApiHost;
//# sourceMappingURL=host.js.map