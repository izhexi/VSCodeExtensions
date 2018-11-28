"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
// [GET] /commands
function GET(args) {
    let canExecute = args.request.user.can('execute');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canExecute) {
            args.sendNotFound();
            completed();
            return;
        }
        vscode.commands.getCommands(false).then((commands) => {
            args.response.data = commands.map(x => {
                let cmdItem = {
                    name: x,
                    path: '/api/commands/' + encodeURIComponent(x),
                };
                return cmdItem;
            });
            args.response.data.sort((x, y) => {
                return rapi_helpers.compareValues(rapi_helpers.normalizeString(x.name), rapi_helpers.normalizeString(y.name));
            });
            completed();
        }, (err) => {
            completed(err);
        });
    });
}
exports.GET = GET;
// [POST] /commands/{commandId}
function POST(args) {
    let canExecute = args.request.user.can('execute');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canExecute) {
            args.sendForbidden();
            completed();
            return;
        }
        vscode.commands.getCommands(false).then((commands) => {
            let path = args.path;
            let firstSep = path.indexOf('/');
            let commandToExecute;
            if (firstSep > -1) {
                commandToExecute = rapi_helpers.normalizeString(path.substring(firstSep + 1));
            }
            if (commandToExecute) {
                // find machting commands
                let knownCommands = [];
                for (let i = 0; i < commands.length; i++) {
                    let kc = commands[i];
                    if (rapi_helpers.normalizeString(kc) == commandToExecute) {
                        knownCommands.push(kc);
                        break;
                    }
                }
                if (knownCommands.length) {
                    // try read arguments from body
                    args.getJSON().then((body) => {
                        let cmdArgs;
                        if (body) {
                            cmdArgs = rapi_helpers.asArray(body);
                        }
                        cmdArgs = cmdArgs || [];
                        try {
                            let nextCommand;
                            nextCommand = () => {
                                if (knownCommands.length < 1) {
                                    completed();
                                    return;
                                }
                                try {
                                    vscode.commands
                                        .executeCommand
                                        .apply(null, [knownCommands.shift()].concat(cmdArgs))
                                        .then(() => {
                                        nextCommand();
                                    }, (err) => {
                                        completed(err);
                                    });
                                }
                                catch (e) {
                                    completed(e);
                                }
                            };
                            nextCommand();
                        }
                        catch (e) {
                            completed(e);
                        }
                    }, (err) => {
                        completed(err);
                    });
                }
                else {
                    // no matching command(s) found
                    args.sendNotFound();
                    completed();
                }
            }
            else {
                // no command defined
                args.statusCode = 400;
                completed();
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.POST = POST;
//# sourceMappingURL=commands.js.map