"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("./helpers");
/**
 * HTML content provider.
 */
class HtmlTextDocumentContentProvider {
    /**
     * Initializes a new instance of that class.
     *
     * @param {rapi_controller.Controller} controller The underlying controller instance.
     */
    constructor(controller) {
        this._CONTROLLER = controller;
    }
    /**
     * Gets the underlying controller.
     */
    get controller() {
        return this._CONTROLLER;
    }
    /** @inheritdoc */
    provideTextDocumentContent(uri, token) {
        let me = this;
        return new Promise((resolve, reject) => {
            let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
            try {
                let executor;
                const REGEX_MODULE = new RegExp(/^(\s)*(\/)?([^\/]+)/, 'i');
                let match = REGEX_MODULE.exec(uri.path);
                if (match) {
                    let moduleName = rapi_helpers.normalizeString(match[3]);
                    if (moduleName) {
                        let htmlModule = require('./html/modules/' + moduleName);
                        if (htmlModule) {
                            executor = htmlModule.execute;
                        }
                    }
                }
                let executed = (err, result) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        completed(null, result ? rapi_helpers.toStringSafe(result)
                            : result);
                    }
                };
                if (executor) {
                    let executorArgs = {
                        cancelToken: token,
                        uri: uri,
                        workspaceState: undefined,
                    };
                    // executorArgs.workspaceState
                    Object.defineProperty(executorArgs, 'workspaceState', {
                        enumerable: true,
                        get: () => {
                            return me.controller.workspaceState;
                        }
                    });
                    let executorResult = executor(executorArgs);
                    if ('object' === typeof executorResult) {
                        executorResult.then((result) => {
                            executed(null, result);
                        }, (err) => {
                            executed(err);
                        });
                    }
                    else {
                        executed(null, executorResult);
                    }
                }
                else {
                    executed(new Error('No executor found!'));
                }
            }
            catch (e) {
                completed(e);
            }
        });
    }
}
exports.HtmlTextDocumentContentProvider = HtmlTextDocumentContentProvider;
//# sourceMappingURL=content.js.map