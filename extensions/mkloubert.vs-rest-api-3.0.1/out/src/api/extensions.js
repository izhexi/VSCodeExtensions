"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
function extensionToObject(extension) {
    let obj;
    if (extension) {
        obj = {
            id: rapi_helpers.toStringSafe(extension.id),
            isActive: rapi_helpers.toBooleanSafe(extension.isActive),
            localPath: rapi_helpers.toStringSafe(extension.extensionPath),
        };
        obj['path'] = '/api/extensions/' + encodeURIComponent(obj['id']);
    }
    return obj;
}
// [GET] /extensions
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = (err, extensions) => {
            if (err) {
                reject(err);
            }
            else {
                args.response.data = extensions;
                resolve();
            }
        };
        try {
            let extensions = vscode.extensions.all.filter(x => x)
                .map(x => extensionToObject(x));
            extensions.sort((x, y) => {
                return rapi_helpers.compareValues(rapi_helpers.normalizeString(x['id']), rapi_helpers.normalizeString(y['id']));
            });
            completed(null, extensions);
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.GET = GET;
;
// [POST] /extensions/{id}
function POST(args) {
    let canActivate = args.request.user.can('activate');
    return new Promise((resolve, reject) => {
        let completed = (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        };
        if (!canActivate) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let parts = args.path.split('/');
            let id;
            if (parts.length > 1) {
                id = rapi_helpers.normalizeString(parts[1]);
            }
            let extensions = vscode.extensions.all.filter(x => x);
            let result = [];
            let nextExtension;
            nextExtension = () => {
                if (extensions.length < 1) {
                    if (result.length < 1) {
                        args.sendNotFound();
                    }
                    else {
                        args.response.data = result;
                    }
                    completed();
                    return;
                }
                let ext = extensions.shift();
                if (rapi_helpers.normalizeString(ext.id) == id) {
                    ext.activate().then(() => {
                        result.push(extensionToObject(ext));
                        nextExtension();
                    }, (err) => {
                        completed(err);
                    });
                }
                else {
                    nextExtension();
                }
            };
            nextExtension();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.POST = POST;
;
//# sourceMappingURL=extensions.js.map