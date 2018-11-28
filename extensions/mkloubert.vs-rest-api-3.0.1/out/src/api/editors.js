"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
// [DELETE] /editors(/{id})
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
            let editor = getEditorById(args);
            if (editor) {
                // DEPRECATED
                editor.editor.hide();
            }
            else {
                // no (matching) tab found
                args.sendNotFound();
            }
            completed();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.DELETE = DELETE;
function editorToObject(editor, user) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        try {
            if (!editor) {
                completed();
                return;
            }
            rapi_helpers.textDocumentToObject(editor.editor.document, user).then((obj) => {
                if (obj) {
                    delete obj['openPath'];
                    if (!rapi_helpers.isNullOrUndefined(editor.id)) {
                        obj['id'] = editor.id;
                        obj['path'] = '/api/editors/' + editor.id;
                    }
                }
                completed(null, obj);
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
// [GET] /editors
function GET(args) {
    return new Promise((resolve, reject) => {
        let docs = [];
        let completed = (err) => {
            if (err) {
                reject(err);
            }
            else {
                args.response.data = docs;
                resolve();
            }
        };
        try {
            let visibleEditors = vscode.window.visibleTextEditors.filter(x => x);
            let id = -1;
            let nextEditor;
            nextEditor = () => {
                if (visibleEditors.length < 1) {
                    completed();
                    return;
                }
                let editor = {
                    editor: visibleEditors.shift(),
                    id: ++id,
                };
                editorToObject(editor, args.request.user).then((obj) => {
                    if (obj) {
                        obj['id'] = id;
                        obj['path'] = '/api/editors/' + id;
                        docs.push(obj);
                    }
                    nextEditor();
                }, (err) => {
                    completed(err);
                });
            };
            nextEditor();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.GET = GET;
function getEditorById(args) {
    let editor;
    let parts = args.path.split('/');
    if (parts.length > 1) {
        let id = parts[1];
        if (rapi_helpers.isEmptyString(id)) {
            editor = {
                editor: vscode.window.activeTextEditor,
            };
        }
        else {
            let idValue = parseInt(id.trim());
            if (!isNaN(idValue)) {
                let visibleEditors = vscode.window.visibleTextEditors.filter(x => x);
                if (idValue >= 0 && idValue < visibleEditors.length) {
                    editor = {
                        editor: visibleEditors[idValue],
                        id: idValue,
                    };
                }
            }
        }
    }
    else {
        editor = {
            editor: vscode.window.activeTextEditor,
        };
    }
    return editor;
}
// [PATCH] /editors(/{id})
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
            let editor = getEditorById(args);
            if (editor) {
                args.getBody().then((body) => {
                    try {
                        let str = (body || Buffer.alloc(0)).toString('utf8');
                        rapi_helpers.setContentOfTextEditor(editor.editor, str).then((doc) => {
                            editorToObject(editor, args.request.user).then((obj) => {
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
// [POST] /editors(/{id})
function POST(args) {
    let canOpen = args.request.user.can('open');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canOpen) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let editor = getEditorById(args);
            if (editor) {
                editor.editor.show();
                editorToObject(editor, args.request.user).then((obj) => {
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
exports.POST = POST;
// [PUT] /editors(/{id})
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
            let editor = getEditorById(args);
            let doc;
            if (editor) {
                doc = editor.editor.document;
            }
            if (doc) {
                doc.save();
                editorToObject(editor, args.request.user).then((obj) => {
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
//# sourceMappingURL=editors.js.map