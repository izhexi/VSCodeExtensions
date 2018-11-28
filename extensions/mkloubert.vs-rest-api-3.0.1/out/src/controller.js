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
const i18 = require("./i18");
const Moment = require("moment");
const OS = require("os");
const rapi_contracts = require("./contracts");
const rapi_helpers = require("./helpers");
const rapi_host = require("./host");
const vscode = require("vscode");
const rapi_whiteboard = require("./whiteboard");
/**
 * The controller of that extension.
 */
class Controller {
    /**
     * Initializes a new instance of that class.
     *
     * @param {vscode.ExtensionContext} context The underlying extension context.
     * @param {vscode.OutputChannel} outputChannel The global output channel to use.
     * @param {rapi_contracts.PackageFile} pkgFile The package file of that extension.
     */
    constructor(context, outputChannel, pkgFile) {
        this._CONTEXT = context;
        this._OUTPUT_CHANNEL = outputChannel;
        this._PACKAGE_FILE = pkgFile;
    }
    /**
     * Gets the current configuration.
     */
    get config() {
        return this._config;
    }
    /**
     * Gets the extension context.
     */
    get context() {
        return this._CONTEXT;
    }
    /**
     * Logs a message.
     *
     * @param {any} msg The message to log.
     *
     * @chainable
     */
    log(msg) {
        let now = Moment();
        msg = rapi_helpers.toStringSafe(msg);
        this.outputChannel
            .appendLine(`[${now.format('YYYY-MM-DD HH:mm:ss')}] ${msg}`);
        return this;
    }
    /** @inheritdoc */
    dispose() {
    }
    /**
     * Returns a copy of the global data from the settings.
     *
     * @return {any} The global data from the settings.
     */
    getGlobals() {
        let globals = this.config.globals;
        if (globals) {
            globals = rapi_helpers.cloneObject(globals);
        }
        return globals;
    }
    /**
     * Get the name that represents that machine.
     */
    get name() {
        return rapi_helpers.normalizeString(OS.hostname());
    }
    /**
     * The 'on activated' event.
     */
    onActivated() {
        this.reloadConfiguration();
    }
    /**
     * The 'on deactivate' event.
     */
    onDeactivate() {
    }
    /**
     * Event after configuration changed.
     */
    onDidChangeConfiguration() {
        this.reloadConfiguration();
    }
    /**
     * Gets the global output channel.
     */
    get outputChannel() {
        return this._OUTPUT_CHANNEL;
    }
    /**
     * Gets the package file of that extension.
     */
    get packageFile() {
        return this._PACKAGE_FILE;
    }
    /**
     * Reloads configuration.
     */
    reloadConfiguration() {
        let me = this;
        let oldWorkspaceState = this._workspaceState;
        if (oldWorkspaceState) {
            // dispose old output channels
            let oldOutputChannels = oldWorkspaceState['outputChannels'];
            if (oldOutputChannels) {
                oldOutputChannels.filter(x => x).forEach(x => {
                    rapi_helpers.tryDispose(x);
                });
                delete oldWorkspaceState['outputChannels'];
            }
        }
        let cfg = vscode.workspace.getConfiguration("rest.api");
        me._workspaceState = {
            globalAccountPreparerStates: {},
            globalAccountPreparerScriptStates: {},
            globalHookStates: {},
            globalHookScriptStates: {},
            outputChannels: [],
        };
        me._workspaceState[rapi_contracts.VAR_HTML_DOCS] = [];
        me._workspaceState[rapi_contracts.VAR_NEXT_HTML_DOC_ID] = -1;
        let nextSteps = (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Could not load language: ${rapi_helpers.toStringSafe(err)}`);
                return;
            }
            me._config = cfg;
            // whiteboard
            me._whiteboard = null;
            {
                let whiteboardCfg;
                if (!rapi_helpers.isNullOrUndefined(cfg.whiteboard)) {
                    if ('object' === typeof cfg.whiteboard) {
                        whiteboardCfg = cfg.whiteboard;
                    }
                    else {
                        whiteboardCfg = {
                            isActive: rapi_helpers.toBooleanSafe(cfg.whiteboard, true),
                        };
                    }
                }
                else {
                    whiteboardCfg = {};
                }
                if (rapi_helpers.toBooleanSafe(whiteboardCfg.isActive, true)) {
                    let newWhiteboard = new rapi_whiteboard.MemoryWhitespaceRepository(me, whiteboardCfg);
                    newWhiteboard.init().then(() => {
                        me._whiteboard = newWhiteboard;
                    }, (err) => {
                        vscode.window.showErrorMessage('[vs-rest-api] ' + i18.t('whiteboard.initFailed', err));
                    });
                }
            }
            me.showNewVersionPopup();
            if (rapi_helpers.toBooleanSafe(cfg.autoStart)) {
                this.start().then(() => {
                    //TODO
                }, (e) => {
                    me.log(`[ERROR] Controller.reloadConfiguration().autoStart(1): ${rapi_helpers.toStringSafe(e)}`);
                });
            }
            else {
                this.stop().then(() => {
                    //TODO
                }, (e) => {
                    me.log(`[ERROR] Controller.reloadConfiguration().autoStart(2): ${rapi_helpers.toStringSafe(e)}`);
                });
            }
        };
        // load language
        try {
            i18.init(cfg.lang).then(() => {
                nextSteps();
            }, (err) => {
                nextSteps(err);
            });
        }
        catch (e) {
            nextSteps(e);
        }
    }
    /**
     * Shows the popup for a new version.
     */
    showNewVersionPopup() {
        let me = this;
        let pkg = me.packageFile;
        if (!pkg) {
            return;
        }
        let currentVersion = pkg.version;
        if (!currentVersion) {
            return;
        }
        const KEY_LAST_KNOWN_VERSION = 'vsraLastKnownVersion';
        // update last known version
        let updateCurrentVersion = false;
        try {
            let lastKnownVersion = this._CONTEXT.globalState.get(KEY_LAST_KNOWN_VERSION, false);
            if (lastKnownVersion != currentVersion) {
                if (!rapi_helpers.toBooleanSafe(this.config.disableNewVersionPopups)) {
                    // tell the user that it runs on a new version
                    updateCurrentVersion = true;
                    // [BUTTON] show change log
                    let changeLogBtn = {
                        action: () => {
                            rapi_helpers.open('https://github.com/mkloubert/vs-rest-api/blob/master/CHANGELOG.md').then(() => {
                            }, (err) => {
                                me.log(i18.t('errors.withCategory', 'Controller.showNewVersionPopup(4)', err));
                            });
                        },
                        title: i18.t('popups.newVersion.showChangeLog'),
                    };
                    vscode.window
                        .showInformationMessage(i18.t('popups.newVersion.message', currentVersion), changeLogBtn)
                        .then((item) => {
                        if (!item || !item.action) {
                            return;
                        }
                        try {
                            item.action();
                        }
                        catch (e) {
                            me.log(i18.t('errors.withCategory', 'Controller.showNewVersionPopup(3)', e));
                        }
                    });
                }
            }
        }
        catch (e) {
            me.log(i18.t('errors.withCategory', 'Controller.showNewVersionPopup(2)', e));
        }
        if (updateCurrentVersion) {
            // update last known version
            try {
                this._CONTEXT.globalState.update(KEY_LAST_KNOWN_VERSION, currentVersion);
            }
            catch (e) {
                me.log(i18.t('errors.withCategory', 'Controller.showNewVersionPopup(1)', e));
            }
        }
    }
    /**
     * Starts the host.
     *
     * @return {PromiseLike<rapi_host.VSCodeRemoteHost>} The promise.
     */
    start() {
        let me = this;
        let cfg = me.config;
        let port;
        let defaultPort = rapi_host.DEFAULT_PORT;
        if ('object' === typeof cfg.port) {
            for (let p in cfg.port) {
                if (rapi_helpers.normalizeString(p) == me.name) {
                    port = parseInt(rapi_helpers.toStringSafe(cfg.port[p]).trim());
                    break;
                }
                if (rapi_helpers.isEmptyString(p)) {
                    defaultPort = parseInt(rapi_helpers.toStringSafe(cfg.port[p]).trim());
                }
            }
        }
        else {
            if (!rapi_helpers.isEmptyString(cfg.port)) {
                port = parseInt(rapi_helpers.toStringSafe(cfg.port).trim());
            }
        }
        if (rapi_helpers.isNullOrUndefined(port)) {
            port = defaultPort;
        }
        return new Promise((resolve, reject) => {
            let completed = (err, h) => {
                if (err) {
                    vscode.window.showErrorMessage(`[vs-rest-api] ${i18.t('host.startFailed', err)}`);
                    reject(err);
                }
                else {
                    if (rapi_helpers.toBooleanSafe(cfg.showPopupOnSuccess, true)) {
                        vscode.window.showInformationMessage(`[vs-rest-api] ${i18.t('host.started', port)}.`);
                    }
                    let protocol = 'http';
                    if (cfg.ssl) {
                        protocol += 's';
                    }
                    let browserUrl = `${protocol}://127.0.0.1:${port}/api/`;
                    me.outputChannel.appendLine(`${i18.t('host.started', port)}:`);
                    try {
                        me.outputChannel.appendLine(`\t- ${protocol}://${rapi_helpers.normalizeString(OS.hostname())}:${port}/api/`);
                        let networkInterfaces = OS.networkInterfaces();
                        let networkInterfaceNames = Object.keys(networkInterfaces);
                        if (networkInterfaceNames.length > 0) {
                            networkInterfaceNames.forEach((ifName) => {
                                let ifaces = networkInterfaces[ifName].filter(x => {
                                    let addr = rapi_helpers.normalizeString(x.address);
                                    if ('IPv4' == x.family) {
                                        return !/^(127\.[\d.]+|[0:]+1|localhost)$/.test(addr);
                                    }
                                    return false;
                                });
                                ifaces.forEach((x) => {
                                    me.outputChannel.appendLine(`\t- ${protocol}://${x.address}:${port}/api/`);
                                });
                            });
                        }
                    }
                    catch (e) {
                        me.log(i18.t('errors.withCategory', e));
                    }
                    me.outputChannel.appendLine('');
                    if (rapi_helpers.toBooleanSafe(cfg.openInBrowser)) {
                        rapi_helpers.open(browserUrl).then(() => {
                            //TODO
                        }, (err) => {
                            vscode.window.showWarningMessage(`[vs-rest-api] ${i18.t('browser.openFailed', browserUrl, err)}`);
                        });
                    }
                    resolve(h);
                }
            };
            let startHost = () => {
                me._host = null;
                let newHost = new rapi_host.ApiHost(me);
                newHost.start(port).then((started) => {
                    if (started) {
                        me._host = newHost;
                        completed(null, newHost);
                    }
                    else {
                        completed(new Error(`[vs-rest-api] ${i18.t('host.notStarted')}`));
                    }
                }, (err) => {
                    completed(err);
                });
            };
            let currentHost = me._host;
            if (currentHost) {
                // restart
                currentHost.stop().then(() => {
                    startHost();
                }, (err) => {
                    completed(err);
                });
            }
            else {
                startHost();
            }
        });
    }
    /**
     * Stops the host.
     *
     * @return {PromiseLike<boolean>} The promise.
     */
    stop() {
        let me = this;
        let cfg = me.config;
        return new Promise((resolve, reject) => {
            let completed = (err, stopped) => {
                if (err) {
                    vscode.window.showErrorMessage(`[vs-rest-api] ${i18.t('host.stopFailed', err)}`);
                    reject(err);
                }
                else {
                    if (stopped) {
                        if (rapi_helpers.toBooleanSafe(cfg.showPopupOnSuccess, true)) {
                            vscode.window.showInformationMessage(`[vs-rest-api] ${i18.t('host.stopped')}`);
                        }
                    }
                    resolve(stopped);
                }
            };
            let currentHost = me._host;
            if (currentHost) {
                currentHost.stop().then((stopped) => {
                    me._host = null;
                    completed(null, stopped);
                }, (err) => {
                    completed(err);
                });
            }
            else {
                // nothing to stop
                completed(null, false);
            }
        });
    }
    /**
     * Toggle the state of the current host.
     *
     * @returns {PromiseLike<boolean>} The promise.
     */
    toggleHostState() {
        let me = this;
        return new Promise((resolve, reject) => {
            if (me._host) {
                me.stop().then(() => {
                    resolve(false);
                }, (err) => {
                    reject(err);
                });
            }
            else {
                me.start().then(() => {
                    resolve(true);
                }, (err) => {
                    reject(err);
                });
            }
        });
    }
    /**
     * Gets the current whiteboard (repository).
     */
    get whiteboard() {
        return this._whiteboard;
    }
    /**
     * Gets the object that shares data workspace wide.
     */
    get workspaceState() {
        return this._workspaceState;
    }
}
exports.Controller = Controller;
//# sourceMappingURL=controller.js.map