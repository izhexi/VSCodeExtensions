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
const Moment = require("moment");
const Path = require("path");
const rapi_helpers = require("../helpers");
const rapi_workspace = require("../workspace");
const vscode = require("vscode");
function normalizePath(p) {
    p = rapi_helpers.toStringSafe(p);
    if (!p) {
        return p;
    }
    p = rapi_helpers.replaceAllStrings(p, "\\", '/');
    p = rapi_helpers.replaceAllStrings(p, Path.sep, '/');
    return p;
}
// [POST] /files
function POST(args) {
    let canOpen = args.request.user.can('open');
    return new Promise((resolve, reject) => {
        let files = [];
        let completed = (err) => {
            if (err) {
                reject(err);
            }
            else {
                files.sort((x, y) => {
                    return rapi_helpers.compareValues(rapi_helpers.normalizeString(x.path), rapi_helpers.normalizeString(y.path));
                });
                args.response.data = files;
                resolve();
            }
        };
        args.getJSON().then((opts) => {
            opts = opts || {
                include: undefined,
            };
            let include = rapi_helpers.toStringSafe(opts.include);
            if (rapi_helpers.isEmptyString(include)) {
                include = '**';
            }
            let exclude = rapi_helpers.toStringSafe(opts.exclude);
            if (rapi_helpers.isEmptyString(exclude)) {
                exclude = undefined;
            }
            let maxResult = parseInt(rapi_helpers.toStringSafe(opts.maxResults).trim());
            if (isNaN(maxResult)) {
                maxResult = undefined;
            }
            vscode.workspace.findFiles(include, exclude, maxResult).then((uris) => {
                let nextFile;
                nextFile = () => {
                    if (uris.length < 1) {
                        completed();
                        return;
                    }
                    let u = uris.shift();
                    let fullPath = u.fsPath;
                    if (!Path.isAbsolute(fullPath)) {
                        fullPath = Path.join(rapi_workspace.getRootPath(), fullPath);
                    }
                    fullPath = Path.resolve(fullPath);
                    args.request.user.isFileVisible(u.fsPath, args.request.user.account.withDot).then((isVisible) => {
                        if (isVisible) {
                            FS.stat(fullPath, (err, stats) => {
                                if (err) {
                                    completed(err);
                                }
                                let relativePath = rapi_helpers.toRelativePath(fullPath);
                                if (false !== relativePath) {
                                    if (stats.isFile()) {
                                        let filePath = normalizePath(relativePath).split('/')
                                            .map(x => encodeURIComponent(x))
                                            .join('/');
                                        let newFileItem = {
                                            creationTime: toISODateString(stats.birthtime),
                                            lastChangeTime: toISODateString(stats.ctime),
                                            lastModifiedTime: toISODateString(stats.mtime),
                                            mime: rapi_helpers.detectMimeByFilename(fullPath),
                                            name: Path.basename(filePath),
                                            path: '/api/workspace' + filePath,
                                            size: stats.size,
                                            type: 'file',
                                        };
                                        if (canOpen) {
                                            newFileItem.openPath = '/api/editor' + filePath;
                                        }
                                        files.push(newFileItem);
                                    }
                                }
                                nextFile();
                            });
                        }
                        else {
                            nextFile();
                        }
                    });
                };
                nextFile();
            }, (err) => {
                completed(err);
            });
        }, (err) => {
            completed(err);
        });
    });
}
exports.POST = POST;
function toISODateString(dt) {
    if (!dt) {
        return;
    }
    return Moment(dt).utc().toISOString();
}
//# sourceMappingURL=files.js.map