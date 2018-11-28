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
const Glob = require('glob');
const Path = require("path");
const rapi_contracts = require("../contracts");
const rapi_helpers = require("../helpers");
const rapi_workspace = require("../workspace");
/**
 * Name of a variable that defines if an user has the right activate extensions or not.
 */
exports.VAR_CAN_ACTIVATE = 'can_activate';
/**
 * Name of a variable that defines if an user has the right to do anything with the API or not.
 */
exports.VAR_CAN_ANYTHING = 'can_anything';
/**
 * Name of a variable that defines if an user has the right to close editor tabs or not.
 */
exports.VAR_CAN_CLOSE = 'can_close';
/**
 * Name of a variable that defines if an user has the right to create things like output channels or not or not.
 */
exports.VAR_CAN_CREATE = 'can_create';
/**
 * Name of a variable that defines if an user has the right to delete items or not.
 */
exports.VAR_CAN_DELETE = 'can_delete';
/**
 * Name of a variable that defines if an user has the right to deploy files or not.
 */
exports.VAR_CAN_DEPLOY = 'can_deploy';
/**
 * Name of a variable that defines if an user can execute commands or not.
 */
exports.VAR_CAN_EXECUTE = 'can_execute';
/**
 * Name of a variable that defines if an user can open an editor tab or not.
 */
exports.VAR_CAN_OPEN = 'can_open';
/**
 * Name of a variable that defines if an user has write access or not.
 */
exports.VAR_CAN_WRITE = 'can_write';
/**
 * Name of a variable that defines if an user can see directories with leading dots or not.
 */
exports.VAR_WITH_DOT = 'with_dot';
const DEFAULT_USER = {
    __globals: {},
};
class User {
    constructor(ctx, account, isGuest) {
        this._ACCOUNT = account;
        this._CONTEXT = ctx;
        this._IS_GUEST = rapi_helpers.toBooleanSafe(isGuest);
    }
    get account() {
        return this._ACCOUNT;
    }
    can(name, defaultValue) {
        name = this.parseVarName(name);
        let value = this.get('can_' + name, rapi_helpers.toBooleanSafe(defaultValue));
        return rapi_helpers.toBooleanSafe(value ||
            this.get(exports.VAR_CAN_ANYTHING, false));
    }
    get context() {
        return this._CONTEXT;
    }
    get(name, defaultValue) {
        name = this.parseVarName(name);
        let value = defaultValue;
        for (let p in this.account.__globals) {
            if (p == name) {
                value = this.account.__globals[p];
                break;
            }
        }
        return value;
    }
    has(name) {
        name = this.parseVarName(name);
        return this.account.__globals.hasOwnProperty(name);
    }
    isDirVisible(dir, withDot) {
        let me = this;
        return new Promise((resolve, reject) => {
            let completed = (err, isVisible) => {
                if (err) {
                    reject();
                }
                else {
                    resolve(isVisible);
                }
            };
            try {
                let normalizePath = (p) => {
                    p = Path.resolve(p);
                    p = rapi_helpers.replaceAllStrings(p, Path.sep, '/');
                    return p;
                };
                if (!Path.isAbsolute(dir)) {
                    dir = Path.join(rapi_workspace.getRootPath(), dir);
                }
                let parentDir = dir + '/..';
                try {
                    parentDir = normalizePath(parentDir);
                }
                catch (e) {
                    parentDir = dir;
                }
                dir = normalizePath(dir);
                let dirName = Path.basename(dir);
                let checkThisDirectory = () => {
                    FS.lstat(dir, (err, stats) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            let isVisible = null;
                            if (stats.isDirectory()) {
                                isVisible = true;
                                if (0 == rapi_helpers.normalizeString(dirName).indexOf('.')) {
                                    isVisible = rapi_helpers.toBooleanSafe(me.get(exports.VAR_WITH_DOT) || withDot);
                                }
                            }
                            completed(null, isVisible);
                        }
                    });
                };
                // check parent directory
                if (rapi_helpers.normalizeString(dir) == parentDir) {
                    // there is no parent directory to check
                    checkThisDirectory();
                }
                else {
                    me.isDirVisible(parentDir, withDot).then((isDirectoryVisible) => {
                        if (isDirectoryVisible) {
                            checkThisDirectory();
                        }
                        else {
                            completed(null, false);
                        }
                    }, (err) => {
                        completed(err);
                    });
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }
    isFileVisible(file, withDot) {
        let me = this;
        return new Promise((resolve, reject) => {
            let completed = (err, isVisible) => {
                if (err) {
                    reject();
                }
                else {
                    resolve(isVisible);
                }
            };
            try {
                let normalizePath = (p) => {
                    p = Path.resolve(p);
                    p = rapi_helpers.replaceAllStrings(p, Path.sep, '/');
                    return p;
                };
                if (!Path.isAbsolute(file)) {
                    file = Path.join(rapi_workspace.getRootPath(), file);
                }
                file = normalizePath(file);
                FS.stat(file, (err, stats) => {
                    if (err) {
                        completed(err);
                        return;
                    }
                    if (!stats.isFile()) {
                        completed(null, false);
                        return;
                    }
                    try {
                        let dir = Path.dirname(file);
                        me.isDirVisible(dir, withDot).then((isDirectoryVisible) => {
                            if (!isDirectoryVisible) {
                                completed(null, false); // directory not visible
                                return;
                            }
                            let patterns = rapi_helpers.asArray(me.account.files)
                                .map(x => rapi_helpers.toStringSafe(x))
                                .filter(x => !rapi_helpers.isEmptyString(x));
                            patterns = rapi_helpers.distinctArray(patterns);
                            if (patterns.length < 1) {
                                patterns = ['**'];
                            }
                            let excludePatterns = rapi_helpers.asArray(me.account.exclude)
                                .map(x => rapi_helpers.toStringSafe(x))
                                .filter(x => !rapi_helpers.isEmptyString(x));
                            excludePatterns = rapi_helpers.distinctArray(excludePatterns);
                            let nextPattern;
                            nextPattern = () => {
                                if (patterns.length < 1) {
                                    completed(null, false);
                                    return;
                                }
                                let p = patterns.shift();
                                try {
                                    Glob(p, {
                                        absolute: true,
                                        cwd: rapi_workspace.getRootPath(),
                                        dot: true,
                                        ignore: excludePatterns,
                                        nodir: true,
                                        root: rapi_workspace.getRootPath(),
                                    }, (err, matchingFiles) => {
                                        if (err) {
                                            completed(err);
                                            return;
                                        }
                                        matchingFiles = matchingFiles.map(x => normalizePath(x));
                                        if (matchingFiles.indexOf(file) > -1) {
                                            completed(null, true);
                                            return;
                                        }
                                        else {
                                            nextPattern();
                                        }
                                    });
                                }
                                catch (e) {
                                    completed(e);
                                }
                            };
                            nextPattern();
                        }, (err) => {
                            completed(err);
                        });
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
    get isGuest() {
        return this._IS_GUEST;
    }
    /**
     * Parses a value for use as variable name.
     *
     * @param {string} name The input value.
     *
     * @return {string} The parsed value.
     */
    parseVarName(name) {
        return rapi_helpers.normalizeString(name);
    }
    set(name, value) {
        this.account.__globals[this.parseVarName(name)] = value;
        return this;
    }
    unset(name) {
        name = this.parseVarName(name);
        delete this.account.__globals[name];
        return this;
    }
}
/**
 * Tries to find an user by request context.
 *
 * @param {rapi_contracts.RequestContext} ctx The request context.
 *
 * @return {PromiseLike<rapi_contracts.User>} The promise.
 */
function getUser(ctx) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        try {
            let result;
            let nextAction = () => {
                completed(null, result);
            };
            let createGuestUser = (account) => {
                if (!account) {
                    //TODO: create by IP
                    account = DEFAULT_USER;
                }
                result = new User(ctx, account, true);
            };
            try {
                let headers = ctx.request.headers;
                let usernameAndPassword;
                if (headers) {
                    for (let p in headers) {
                        if (rapi_helpers.normalizeString(p) == 'authorization') {
                            let value = rapi_helpers.toStringSafe(headers[p]).trim();
                            if (0 == value.toLowerCase().indexOf('basic ')) {
                                usernameAndPassword = value.substr(6).trim();
                            }
                        }
                    }
                }
                let activeUsers = rapi_helpers.asArray(ctx.config.users)
                    .filter(x => x)
                    .filter(x => rapi_helpers.toBooleanSafe(x.isActive, true));
                if ((activeUsers.length > 0) || !rapi_helpers.isEmptyString(usernameAndPassword)) {
                    let temp = new Buffer(usernameAndPassword, 'base64').toString('utf8');
                    let username;
                    let password;
                    if (!rapi_helpers.isEmptyString(temp)) {
                        let sepIndex = temp.indexOf(':');
                        if (sepIndex > -1) {
                            username = temp.substr(0, sepIndex);
                            password = temp.substr(sepIndex + 1);
                        }
                        else {
                            username = temp;
                        }
                    }
                    username = rapi_helpers.normalizeString(username);
                    password = rapi_helpers.toStringSafe(password);
                    for (let i = 0; i < activeUsers.length; i++) {
                        let user = activeUsers[i];
                        if (rapi_helpers.normalizeString(user.name) != username) {
                            continue;
                        }
                        let doesMatch = password === rapi_helpers.toStringSafe(user.password);
                        if (doesMatch) {
                            result = new User(ctx, user, false);
                            break;
                        }
                    }
                }
                else {
                    // check guest
                    if ('object' === typeof ctx.config.guest) {
                        if (rapi_helpers.toBooleanSafe(ctx.config.guest.isActive, true)) {
                            createGuestUser(ctx.config.guest);
                        }
                    }
                    else {
                        if (rapi_helpers.toBooleanSafe(ctx.config.guest, true)) {
                            createGuestUser();
                        }
                    }
                }
            }
            catch (e) {
                result = null;
            }
            // apply default values
            if (result) {
                // can anything?
                result.set(exports.VAR_CAN_ANYTHING, rapi_helpers.toBooleanSafe(result.account.canAnything));
                // can activate?
                result.set(exports.VAR_CAN_ACTIVATE, rapi_helpers.toBooleanSafe(result.account.canActivate));
                // can close?
                result.set(exports.VAR_CAN_CLOSE, rapi_helpers.toBooleanSafe(result.account.canClose));
                // can create?
                result.set(exports.VAR_CAN_CREATE, rapi_helpers.toBooleanSafe(result.account.canCreate));
                // can delete files and folders?
                result.set(exports.VAR_CAN_DELETE, rapi_helpers.toBooleanSafe(result.account.canDelete));
                // can deploy?
                result.set(exports.VAR_CAN_DEPLOY, rapi_helpers.toBooleanSafe(result.account.canDeploy));
                // can execute commands?
                result.set(exports.VAR_CAN_EXECUTE, rapi_helpers.toBooleanSafe(result.account.canExecute));
                // can open tabs in editor?
                result.set(exports.VAR_CAN_OPEN, rapi_helpers.toBooleanSafe(result.account.canOpen));
                // can write (files)?
                result.set(exports.VAR_CAN_WRITE, rapi_helpers.toBooleanSafe(result.account.canWrite));
                // custom values
                if (result.account.values) {
                    for (let p in result.account.values) {
                        result.set(p, result.account.values[p]);
                    }
                }
                if (!rapi_helpers.isNullOrUndefined(ctx.config.preparer)) {
                    let userPreparer;
                    if ('object' !== typeof ctx.config.preparer) {
                        let script = rapi_helpers.toStringSafe(ctx.config.preparer);
                        if (!rapi_helpers.isEmptyString(script)) {
                            userPreparer = {
                                script: script,
                            };
                        }
                    }
                    else {
                        userPreparer = ctx.config.preparer;
                    }
                    if (userPreparer) {
                        let preparerScript = userPreparer.script;
                        if (!Path.isAbsolute(preparerScript)) {
                            preparerScript = Path.join(rapi_workspace.getRootPath(), preparerScript);
                        }
                        preparerScript = Path.resolve(preparerScript);
                        let preparerModule = rapi_helpers.loadModuleSync(preparerScript);
                        if (preparerModule) {
                            if (preparerModule.prepare) {
                                let prepareArgs = {
                                    globals: rapi_helpers.cloneObject(ctx.config.globals),
                                    globalState: undefined,
                                    log: function (msg) {
                                        rapi_helpers.log(msg);
                                        return this;
                                    },
                                    openHtml: (html, title, docId) => {
                                        return rapi_helpers.openHtmlDocument(ctx.workspaceState[rapi_contracts.VAR_HTML_DOCS], html, title, docId);
                                    },
                                    options: userPreparer.options,
                                    require: function (id) {
                                        return rapi_helpers.requireModule(id);
                                    },
                                    state: undefined,
                                    user: result,
                                    whiteboard: undefined,
                                    workspaceState: undefined,
                                };
                                // prepareArgs.globalState
                                Object.defineProperty(prepareArgs, 'globalState', {
                                    enumerable: true,
                                    get: function () {
                                        return this.workspaceState['globalAccountPreparerStates'];
                                    }
                                });
                                // prepareArgs.state
                                Object.defineProperty(prepareArgs, 'state', {
                                    enumerable: true,
                                    get: function () {
                                        return this.workspaceState['globalAccountPreparerScriptStates'][preparerScript];
                                    },
                                    set: function (newValue) {
                                        this.workspaceState['globalAccountPreparerScriptStates'][preparerScript] = newValue;
                                    }
                                });
                                // prepareArgs.whiteboard
                                Object.defineProperty(prepareArgs, 'whiteboard', {
                                    enumerable: true,
                                    get: () => {
                                        return ctx.whiteboard;
                                    }
                                });
                                // prepareArgs.workspaceState
                                Object.defineProperty(prepareArgs, 'workspaceState', {
                                    enumerable: true,
                                    get: () => {
                                        return ctx.workspaceState;
                                    }
                                });
                                let preparerResult = preparerModule.prepare(prepareArgs);
                                if (preparerResult) {
                                    nextAction = null;
                                    preparerResult.then((user) => {
                                        result = user || result;
                                        completed();
                                    }, (err) => {
                                        completed(err);
                                    });
                                }
                            }
                        }
                    }
                }
            }
            if (nextAction) {
                nextAction();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.getUser = getUser;
//# sourceMappingURL=users.js.map