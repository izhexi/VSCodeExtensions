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
const Path = require("path");
const rapi_helpers = require("../helpers");
const rapi_workspace = require("../workspace");
const vscode = require("vscode");
// [GET] /deploy
function GET(args) {
    let canDeploy = args.request.user.can('deploy');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canDeploy) {
            args.sendForbidden();
            completed();
            return;
        }
        vscode.commands.getCommands(true).then((commands) => {
            let deployCmd = commands.filter(x => 'extension.deploy.getTargets' == x);
            if (deployCmd.length < 1) {
                args.sendResponse(410);
                completed();
                return;
            }
            try {
                let callback = (err, targets) => {
                    try {
                        if (!err) {
                            if (targets) {
                                args.response.data = targets.filter(x => x).map(x => {
                                    return {
                                        description: rapi_helpers.isEmptyString(x.description) ? undefined : rapi_helpers.toStringSafe(x.description).trim(),
                                        name: x.name ? rapi_helpers.toStringSafe(x.name) : x.name,
                                        type: rapi_helpers.isEmptyString(x.type) ? 'open' : rapi_helpers.normalizeString(x.type),
                                    };
                                });
                            }
                        }
                        completed(err);
                    }
                    catch (e) {
                        completed(e);
                    }
                };
                vscode.commands.executeCommand(deployCmd[0], callback).then(() => {
                    //TODO
                }, (err) => {
                    completed(err);
                });
            }
            catch (e) {
                completed(e);
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.GET = GET;
// [POST] /deploy/{file}
function POST(args) {
    let canDeploy = args.request.user.can('deploy');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let notFound = () => {
            args.sendNotFound();
            completed();
            return;
        };
        if (!canDeploy) {
            args.sendForbidden();
            completed();
            return;
        }
        vscode.commands.getCommands(true).then((commands) => {
            let deployCmd = commands.filter(x => 'extension.deploy.filesTo' == x);
            if (deployCmd.length < 1) {
                args.sendResponse(410);
                completed();
                return;
            }
            try {
                let normalizedPath = rapi_helpers.toStringSafe(args.request.url.pathname);
                normalizedPath = rapi_helpers.replaceAllStrings(normalizedPath, "\\", '/');
                normalizedPath = rapi_helpers.replaceAllStrings(normalizedPath, Path.sep, '/');
                let parts = normalizedPath.split('/')
                    .filter((x, i) => i > 2)
                    .map(x => decodeURIComponent(x))
                    .filter(x => x);
                let fullPath = Path.join(rapi_workspace.getRootPath(), parts.join('/'));
                let relativePath = rapi_helpers.toRelativePath(fullPath);
                if (false === relativePath) {
                    notFound(); // only inside workspace
                    return;
                }
                args.request.user.isFileVisible(fullPath, args.request.user.account.withDot).then((isVisible) => {
                    if (isVisible) {
                        args.getJSON().then((submittedTargetList) => {
                            let targets = rapi_helpers.asArray(submittedTargetList)
                                .map(x => rapi_helpers.normalizeString(x))
                                .filter(x => x);
                            targets = rapi_helpers.distinctArray(targets);
                            vscode.commands.executeCommand(deployCmd[0], [fullPath], targets).then(() => {
                                completed();
                            }, (err) => {
                                completed(err);
                            });
                        });
                    }
                    else {
                        notFound(); // not visible for user
                    }
                }, (err) => {
                    completed(err);
                });
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
//# sourceMappingURL=deploy.js.map