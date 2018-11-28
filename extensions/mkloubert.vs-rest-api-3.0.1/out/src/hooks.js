"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const i18 = require("./i18");
const Path = require("path");
const rapi_contracts = require("./contracts");
const rapi_helpers = require("./helpers");
const rapi_workspace = require("./workspace");
function emitHooks(apiArgs, hookToEmit, hookArgs) {
    hookToEmit = rapi_helpers.normalizeString(hookToEmit);
    hookArgs = hookArgs || [];
    let emitted = false;
    if (hookToEmit) {
        try {
            let listOfHooks = apiArgs.request.config.hooks;
            if (listOfHooks) {
                for (let hp in listOfHooks) {
                    try {
                        let hookPattern = new RegExp(rapi_helpers.toStringSafe(hp), 'i');
                        if (!hookPattern.test(hookToEmit)) {
                            continue;
                        }
                        emitted = true;
                        let allHooks = rapi_helpers.asArray(listOfHooks[hp])
                            .filter(x => x)
                            .map(x => {
                            let hookObj = x;
                            if ('object' !== typeof x) {
                                hookObj = {
                                    script: rapi_helpers.toStringSafe(x),
                                };
                            }
                            return hookObj;
                        })
                            .filter(x => !rapi_helpers.isEmptyString(x.script));
                        allHooks.forEach((h) => {
                            try {
                                let hookScript = h.script;
                                if (!Path.isAbsolute(hookScript)) {
                                    hookScript = Path.join(rapi_workspace.getRootPath(), hookScript);
                                }
                                hookScript = Path.resolve(hookScript);
                                let hookModule = require(hookScript);
                                if (hookModule) {
                                    let executor = hookModule.onHook;
                                    if (executor) {
                                        let executorArgs = {
                                            api: apiArgs,
                                            globals: apiArgs.globals,
                                            globalState: undefined,
                                            hook: hookToEmit,
                                            log: function (msg) {
                                                apiArgs.log(msg);
                                                return this;
                                            },
                                            openHtml: (html, title, docId) => {
                                                return rapi_helpers.openHtmlDocument(apiArgs.workspaceState[rapi_contracts.VAR_HTML_DOCS], html, title, docId);
                                            },
                                            options: h.options,
                                            require: (id) => {
                                                return rapi_helpers.requireModule(id);
                                            },
                                            state: undefined,
                                            whiteboard: undefined,
                                            workspaceState: undefined,
                                        };
                                        // executorArgs.globalState
                                        Object.defineProperty(executorArgs, 'globalState', {
                                            enumerable: true,
                                            get: function () {
                                                return this.workspaceState['globalHookStates'];
                                            }
                                        });
                                        // executorArgs.state
                                        Object.defineProperty(executorArgs, 'state', {
                                            enumerable: true,
                                            get: function () {
                                                return this.workspaceState['globalHookScriptStates'][hookScript];
                                            },
                                            set: function (newValue) {
                                                this.workspaceState['globalHookScriptStates'][hookScript] = newValue;
                                            }
                                        });
                                        // executorArgs.whiteboard
                                        Object.defineProperty(executorArgs, 'whiteboard', {
                                            enumerable: true,
                                            get: () => {
                                                return apiArgs.whiteboard;
                                            }
                                        });
                                        // executorArgs.workspaceState
                                        Object.defineProperty(executorArgs, 'workspaceState', {
                                            enumerable: true,
                                            get: function () {
                                                return apiArgs.workspaceState;
                                            }
                                        });
                                        let executorResult = executor(executorArgs);
                                        if (executorResult) {
                                            executorResult.then(() => {
                                                //TODO
                                            }, (err) => {
                                                rapi_helpers.log(i18.t('errors.withCategory', 'hooks.emitHooks(4)', err));
                                            });
                                        }
                                    }
                                }
                            }
                            catch (e) {
                                rapi_helpers.log(i18.t('errors.withCategory', 'hooks.emitHooks(3)', e));
                            }
                        });
                    }
                    catch (e) {
                        rapi_helpers.log(i18.t('errors.withCategory', 'hooks.emitHooks(2)', e));
                    }
                }
            }
        }
        catch (e) {
            emitted = null;
            rapi_helpers.log(i18.t('errors.withCategory', 'hooks.emitHooks(1)', e));
        }
    }
    return emitted;
}
exports.emitHooks = emitHooks;
//# sourceMappingURL=hooks.js.map