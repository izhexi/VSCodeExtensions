"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
/**
 * Name of the HTTP response header for a revision number.
 */
exports.HTTP_HEADER_REVISION = 'X-Vscode-Restapi-Revision';
/**
 * Name of the HTTP response header for whiteboard title.
 */
exports.HTTP_HEADER_TITLE = 'X-Vscode-Restapi-Title';
// [DELETE] /api/whiteboard
function DELETE(args) {
    let canDelete = args.request.user.can('delete');
    let whiteboard = args.whiteboard;
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!whiteboard) {
            args.sendNotFound();
            completed();
            return;
        }
        if (!canDelete) {
            args.sendForbidden();
            completed();
            return;
        }
        whiteboard.setBoard(null).then(() => {
            completed();
        }, (err) => {
            completed(err);
        });
    });
}
exports.DELETE = DELETE;
// [GET] /api/whiteboard(/{revisiion})
function GET(args) {
    let whiteboard = args.whiteboard;
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let notFound = () => {
            args.sendNotFound();
            completed();
        };
        if (!whiteboard) {
            notFound();
            return;
        }
        let nr;
        if (args.endpoint.arguments.length > 0) {
            nr = parseInt(args.endpoint.arguments[0].trim());
        }
        whiteboard.get(nr).then((revision) => {
            try {
                if (revision) {
                    let buffer;
                    let mime;
                    let title;
                    if (revision.board) {
                        if (revision.board.body) {
                            buffer = revision.board.body;
                        }
                        if (!rapi_helpers.isEmptyString(revision.board.mime)) {
                            mime = rapi_helpers.toStringSafe(revision.board.mime);
                            if (!rapi_helpers.isEmptyString(revision.board.encoding)) {
                                mime += '; charset=' + rapi_helpers.normalizeString(revision.board.encoding);
                            }
                        }
                        if (!rapi_helpers.isEmptyString(revision.board.title)) {
                            title = rapi_helpers.toStringSafe(revision.board.title);
                        }
                    }
                    if (!buffer) {
                        buffer = Buffer.alloc(0);
                    }
                    args.headers[exports.HTTP_HEADER_REVISION] = revision.nr;
                    if (title) {
                        args.headers[exports.HTTP_HEADER_TITLE] = title;
                    }
                    args.setContent(buffer, mime);
                    completed();
                }
                else {
                    notFound();
                }
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
function handleSubmittedRevision(args, repo, func) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        args.getJSON().then((submittedRevision) => {
            try {
                if (submittedRevision) {
                    if ('object' !== typeof submittedRevision) {
                        submittedRevision = {
                            content: (new Buffer(rapi_helpers.toStringSafe(submittedRevision))).toString('base64'),
                            encoding: 'utf-8',
                        };
                        for (let h in args.request.request.headers) {
                            if ('content-type' === rapi_helpers.normalizeString(h)) {
                                submittedRevision.mime = rapi_helpers.normalizeString(args.request.request.headers[h]);
                            }
                        }
                        if (!submittedRevision.mime) {
                            submittedRevision.mime = 'text/plain';
                        }
                    }
                }
                else {
                    submittedRevision = {
                        content: undefined,
                    };
                }
                let newBoard = {
                    body: undefined,
                };
                // content
                if (!rapi_helpers.isEmptyString(submittedRevision.content)) {
                    newBoard.body = new Buffer(submittedRevision.content, 'base64');
                }
                // title
                if (!rapi_helpers.isEmptyString(submittedRevision.title)) {
                    newBoard.title = rapi_helpers.toStringSafe(submittedRevision.title);
                }
                // mime
                if (!rapi_helpers.isEmptyString(submittedRevision.mime)) {
                    newBoard.mime = rapi_helpers.normalizeString(submittedRevision.mime);
                }
                if (!newBoard.mime) {
                    newBoard.mime = undefined;
                }
                // encoding
                if (!rapi_helpers.isEmptyString(submittedRevision.encoding)) {
                    newBoard.encoding = rapi_helpers.normalizeString(submittedRevision.encoding);
                }
                if (!newBoard.encoding) {
                    newBoard.encoding = undefined;
                }
                func.apply(repo, [newBoard]).then((newRevision) => {
                    args.headers[exports.HTTP_HEADER_REVISION] = newRevision.nr;
                    if (newRevision.board) {
                        if (!rapi_helpers.isEmptyString(newRevision.board.title)) {
                            args.headers[exports.HTTP_HEADER_TITLE] = rapi_helpers.toStringSafe(newRevision.board.title);
                        }
                    }
                    args.response.data = revisionToObject(newRevision);
                    completed(null, newRevision);
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
// [POST] /api/whiteboard
function POST(args) {
    let canDelete = args.request.user.can('delete');
    let canWrite = args.request.user.can('write');
    let whiteboard = args.whiteboard;
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!whiteboard) {
            args.sendNotFound();
            completed();
            return;
        }
        if (!canDelete || !canWrite) {
            args.sendForbidden();
            completed();
            return;
        }
        handleSubmittedRevision(args, whiteboard, whiteboard.setBoard).then(() => {
            completed();
        }, (err) => {
            completed(err);
        });
    });
}
exports.POST = POST;
// [PUT] /api/whiteboard
function PUT(args) {
    let canWrite = args.request.user.can('write');
    let whiteboard = args.whiteboard;
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!whiteboard) {
            args.sendNotFound();
            completed();
            return;
        }
        if (!canWrite) {
            args.sendForbidden();
            completed();
            return;
        }
        handleSubmittedRevision(args, whiteboard, whiteboard.addRevision).then(() => {
            completed();
        }, (err) => {
            completed(err);
        });
    });
}
exports.PUT = PUT;
function revisionToObject(revision) {
    let obj;
    if (revision) {
        obj = {};
        if (isNaN(revision.nr)) {
            obj['path'] = '/api/whiteboard';
        }
        else {
            obj['path'] = '/api/whiteboard/' + revision.nr;
            obj['revision'] = revision.nr;
        }
        if (revision.board) {
            if (!rapi_helpers.isNullOrUndefined(revision.board.title)) {
                obj['title'] = rapi_helpers.toStringSafe(revision.board.title);
            }
            if (!rapi_helpers.isEmptyString(revision.board.mime)) {
                obj['mime'] = rapi_helpers.normalizeString(revision.board.mime);
            }
            if (!rapi_helpers.isEmptyString(revision.board.encoding)) {
                obj['encoding'] = rapi_helpers.normalizeString(revision.board.encoding);
            }
            let length;
            if (revision.board.body) {
                length = revision.board.body.length;
            }
            obj['length'] = length;
        }
    }
    return obj;
}
//# sourceMappingURL=whiteboard.js.map