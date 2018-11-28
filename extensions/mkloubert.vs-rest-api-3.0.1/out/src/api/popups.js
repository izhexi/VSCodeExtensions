"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
// [POST] /popups
function POST(args) {
    let canExecute = args.request.user.can('execute');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canExecute) {
            args.sendForbidden();
            completed();
            return;
        }
        args.getJSON().then((obj) => {
            try {
                let opts = obj;
                if (opts) {
                    if ("object" !== typeof obj) {
                        opts = {
                            message: rapi_helpers.toStringSafe(opts),
                            type: "i",
                        };
                    }
                }
                opts = opts || {
                    message: undefined,
                    type: "i",
                };
                let items = rapi_helpers.asArray(opts.items).filter(x => x).map(x => {
                    let msgItem = {
                        action: undefined,
                        title: rapi_helpers.toStringSafe(x.title),
                    };
                    let cmd = rapi_helpers.toStringSafe(x.command).trim();
                    if (cmd) {
                        let cmdArgs = [cmd].concat(x.args || []);
                        msgItem.action = () => {
                            vscode.commands.executeCommand.apply(null, cmdArgs).then(() => {
                                //TODO
                            }, (err) => {
                                rapi_helpers.log(`[ERROR] api.popups.POST.${cmd}: ${rapi_helpers.toStringSafe(err)}`);
                            });
                        };
                    }
                    else {
                        msgItem.action = () => { };
                    }
                    return msgItem;
                }).filter(x => x);
                let func;
                switch (rapi_helpers.normalizeString(opts.type)) {
                    case 'e':
                    case 'error':
                    case 'err':
                        func = vscode.window.showErrorMessage;
                        break;
                    case 'w':
                    case 'warning':
                    case 'warn':
                        func = vscode.window.showWarningMessage;
                        break;
                    default:
                        func = vscode.window.showInformationMessage;
                        break;
                }
                let funcArgs = [rapi_helpers.toStringSafe(opts.message)];
                funcArgs = funcArgs.concat(items);
                func.apply(null, funcArgs).then((i) => {
                    if (i) {
                        try {
                            i.action();
                        }
                        catch (e) {
                            rapi_helpers.log(`[ERROR] api.popups.POST(1): ${rapi_helpers.toStringSafe(e)}`);
                        }
                    }
                }, (err) => {
                    rapi_helpers.log(`[ERROR] api.popups.POST(2): ${rapi_helpers.toStringSafe(err)}`);
                });
                completed();
            }
            catch (e) {
                completed(e);
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.POST = POST;
//# sourceMappingURL=popups.js.map