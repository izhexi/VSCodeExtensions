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
const Path = require("path");
const rapi_helpers = require("../helpers");
const rapi_host_users = require("../host/users");
const rapi_workspace = require("../workspace");
const vscode = require("vscode");
// [DELETE] /editor
function DELETE(args) {
    let canClose = args.request.user.can('close');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canClose) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                vscode.commands.executeCommand('workbench.action.closeActiveEditor').then(() => {
                    completed();
                }, (err) => {
                    completed(err);
                });
            }
            else {
                // no (matching) tab found
                args.sendNotFound();
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.DELETE = DELETE;
// [GET] /editor
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        try {
            let doc;
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                doc = editor.document;
            }
            rapi_helpers.textDocumentToObject(doc, args.request.user).then((obj) => {
                if (obj) {
                    args.response.data = obj;
                }
                else {
                    args.sendNotFound();
                }
                completed();
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.GET = GET;
// [PATCH] /editor
function PATCH(args) {
    let canWrite = args.request.user.can('write');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canWrite) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                args.getBody().then((body) => {
                    try {
                        let str = (body || Buffer.alloc(0)).toString('utf8');
                        rapi_helpers.setContentOfTextEditor(editor, str).then((doc) => {
                            rapi_helpers.textDocumentToObject(editor.document, args.request.user).then((obj) => {
                                args.response.data = obj;
                                completed();
                            }, (err) => {
                                completed(err);
                            });
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
            }
            else {
                args.sendNotFound();
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.PATCH = PATCH;
// [POST] /editor[/{file}]
function POST(args) {
    let canOpen = args.request.user.can('open');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let notFound = () => {
            args.sendNotFound();
            completed();
        };
        if (!canOpen) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let path = args.path;
            let firstSep = path.indexOf('/');
            let fileToOpen;
            if (firstSep > -1) {
                fileToOpen = path.substring(firstSep + 1);
            }
            if (rapi_helpers.isEmptyString(fileToOpen)) {
                fileToOpen = null;
            }
            let openFile = () => {
                vscode.workspace.openTextDocument(fileToOpen).then((doc) => {
                    let returnDoc = () => {
                        completed();
                    };
                    vscode.window.showTextDocument(doc).then(() => {
                        rapi_helpers.textDocumentToObject(doc, args.request.user).then((obj) => {
                            args.response.data = obj;
                            returnDoc();
                        }, (err) => {
                            completed(err);
                        });
                    }, (err) => {
                        // opened, but not shown
                        args.response.code = 1;
                        returnDoc();
                    });
                }, (err) => {
                    completed(err);
                });
            };
            if (fileToOpen) {
                let fullPath = Path.join(rapi_workspace.getRootPath(), fileToOpen);
                let relativePath = rapi_helpers.toRelativePath(fullPath);
                if (false === relativePath) {
                    // cannot open files outside workspace
                    notFound();
                }
                else {
                    FS.stat(fullPath, (err, stats) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            if (stats.isFile()) {
                                args.request.user.isFileVisible(fullPath, args.request.user.get(rapi_host_users.VAR_WITH_DOT)).then((isVisible) => {
                                    if (isVisible) {
                                        fileToOpen = fullPath;
                                        openFile();
                                    }
                                    else {
                                        notFound(); // not visible
                                    }
                                }, (err) => {
                                    completed(err);
                                });
                            }
                            else {
                                notFound(); // we can only open files
                            }
                        }
                    });
                }
            }
            else {
                openFile(); // open untiled tab
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.POST = POST;
// [PUT] /editor
function PUT(args) {
    let canWrite = args.request.user.can('write');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canWrite) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let editor = vscode.window.activeTextEditor;
            let doc;
            if (editor) {
                doc = editor.document;
            }
            if (doc) {
                doc.save();
                rapi_helpers.textDocumentToObject(doc, args.request.user).then((obj) => {
                    args.response.data = obj;
                    completed();
                }, (err) => {
                    completed(err);
                });
            }
            else {
                args.sendNotFound();
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.PUT = PUT;
//# sourceMappingURL=editor.js.map