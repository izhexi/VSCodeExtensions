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
const FSExtra = require('fs-extra');
const Path = require("path");
const Moment = require("moment");
const rapi_helpers = require("../helpers");
const rapi_host_users = require("../host/users");
const rapi_workspace = require("../workspace");
/**
 * HTTP header for defining the file type.
 */
exports.HEADER_FILE_TYPE = 'X-vscode-restapi-type';
const TYPE_DIRECTORY = 'directory';
const TYPE_FILE = 'file';
function deleteItem(args, fullPath) {
    let canDelete = args.request.user.can('delete');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let forbidden = () => {
            args.sendForbidden();
            completed();
        };
        let notFound = () => {
            args.sendNotFound();
            completed();
        };
        if (!canDelete) {
            forbidden();
            return;
        }
        try {
            FS.exists(fullPath, (exists) => {
                if (exists) {
                    FS.stat(fullPath, (err, stats) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            let deleteItem = () => {
                                FSExtra.remove(fullPath, (err) => {
                                    completed(err);
                                });
                            };
                            if (stats.isDirectory()) {
                                args.request.user.isDirVisible(fullPath, args.request.config.withDot).then((isVisible) => {
                                    if (isVisible) {
                                        args.headers[exports.HEADER_FILE_TYPE] = TYPE_DIRECTORY;
                                        deleteItem();
                                    }
                                    else {
                                        notFound(); // not visible
                                    }
                                }, (err) => {
                                    completed(err);
                                });
                            }
                            else if (stats.isFile()) {
                                args.request.user.isFileVisible(fullPath, args.request.config.withDot).then((isVisible) => {
                                    if (isVisible) {
                                        args.headers[exports.HEADER_FILE_TYPE] = TYPE_FILE;
                                        deleteItem();
                                    }
                                    else {
                                        notFound(); // not visible
                                    }
                                }, (err) => {
                                    completed(err);
                                });
                            }
                            else {
                                notFound();
                            }
                        }
                    });
                }
                else {
                    notFound();
                }
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
function handleDirectory(args, dir) {
    let canOpen = args.request.user.can('open');
    return new Promise((resolve, reject) => {
        let dirs = [];
        let files = [];
        let completed = (err, sendList) => {
            sendList = rapi_helpers.toBooleanSafe(sendList, true);
            if (err) {
                reject(err);
            }
            else {
                if (sendList) {
                    dirs = dirs.sort((x, y) => {
                        return rapi_helpers.compareValues(rapi_helpers.normalizeString(x), rapi_helpers.normalizeString(y));
                    });
                    files = files.sort((x, y) => {
                        return rapi_helpers.compareValues(rapi_helpers.normalizeString(x), rapi_helpers.normalizeString(y));
                    });
                    let list = {
                        dirs: [],
                        files: [],
                    };
                    let relativePath = rapi_helpers.toRelativePath(dir);
                    dirs.forEach((x) => {
                        let dirPath = normalizePath(relativePath).split('/')
                            .concat([x.name])
                            .map(x => encodeURIComponent(x))
                            .join('/');
                        list.dirs.push(toDirectory(x, dirPath));
                    });
                    files.forEach((x) => {
                        let filePath = normalizePath(relativePath).split('/')
                            .concat([x.name])
                            .map(x => encodeURIComponent(x))
                            .join('/');
                        list.files.push(toFile(x, canOpen, filePath));
                    });
                    let parentDir = Path.resolve(dir, '..');
                    let relativeParentDir = rapi_helpers.toRelativePath(parentDir);
                    if (false !== relativeParentDir) {
                        if (parentDir != Path.resolve(dir)) {
                            relativeParentDir = rapi_helpers.replaceAllStrings(relativeParentDir, "\\", '/');
                            relativeParentDir = rapi_helpers.replaceAllStrings(relativeParentDir, Path.sep, '/');
                            list['parent'] = '/api/workspace' + normalizePath(relativeParentDir).split('/')
                                .map(x => encodeURIComponent(x))
                                .join('/');
                        }
                    }
                    args.response.data = list;
                    resolve();
                }
            }
        };
        args.headers[exports.HEADER_FILE_TYPE] = TYPE_DIRECTORY;
        FS.readdir(dir, (err, items) => {
            if (err) {
                completed(err);
                return;
            }
            let nextItem;
            nextItem = () => {
                if (items.length < 1) {
                    completed();
                    return;
                }
                let i = items.shift();
                let fullPath = Path.join(dir, i);
                FS.lstat(fullPath, (err, stats) => {
                    if (err) {
                        completed(err);
                    }
                    else {
                        if (stats.isDirectory()) {
                            args.request.user.isDirVisible(fullPath, args.request.config.withDot).then((isVisible) => {
                                if (isVisible) {
                                    dirs.push({
                                        birthtime: stats.birthtime,
                                        ctime: stats.ctime,
                                        fullPath: fullPath,
                                        mtime: stats.mtime,
                                        name: i,
                                    });
                                }
                                nextItem();
                            }, (err) => {
                                completed(err);
                            });
                        }
                        else if (stats.isFile()) {
                            args.request.user.isFileVisible(fullPath, args.request.user.get(rapi_host_users.VAR_WITH_DOT)).then((isVisible) => {
                                if (isVisible) {
                                    files.push({
                                        birthtime: stats.birthtime,
                                        ctime: stats.ctime,
                                        fullPath: fullPath,
                                        mime: rapi_helpers.detectMimeByFilename(i),
                                        mtime: stats.mtime,
                                        name: i,
                                        size: stats.size,
                                    });
                                }
                                nextItem();
                            }, (err) => {
                                completed(err);
                            });
                        }
                        else {
                            nextItem();
                        }
                    }
                });
            };
            nextItem();
        });
    });
}
function handleFile(args, file) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        args.headers[exports.HEADER_FILE_TYPE] = TYPE_FILE;
        switch (args.request.method) {
            case 'get':
                // get file content
                FS.readFile(file, (err, data) => {
                    if (!err) {
                        args.setContent(data, rapi_helpers.detectMimeByFilename(file));
                    }
                    completed(err);
                });
                break;
            default:
                args.sendMethodNotAllowed();
                completed();
                break;
        }
    });
}
function normalizePath(p) {
    p = rapi_helpers.toStringSafe(p);
    if (!p) {
        return p;
    }
    p = rapi_helpers.replaceAllStrings(p, "\\", '/');
    p = rapi_helpers.replaceAllStrings(p, Path.sep, '/');
    return p;
}
//    /api/workspace
function request(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let notFound = () => {
            args.sendNotFound();
            completed();
        };
        let methodNotAllowed = () => {
            args.sendMethodNotAllowed();
            completed();
        };
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
                notFound();
                return;
            }
            switch (args.request.method) {
                case 'delete':
                    deleteItem(args, fullPath).then(() => {
                        completed();
                    }, (err) => {
                        completed(err);
                    });
                    return;
                case 'patch':
                case 'post':
                case 'put':
                    writeFile(args, fullPath).then(() => {
                        completed();
                    }, (err) => {
                        completed(err);
                    });
                    return;
            }
            FS.exists(fullPath, (exists) => {
                if (exists) {
                    FS.lstat(fullPath, (err, stats) => {
                        if (err) {
                            completed(err);
                        }
                        else {
                            let nextAction = () => {
                                methodNotAllowed();
                            };
                            if (stats.isDirectory()) {
                                switch (args.request.method) {
                                    case 'get':
                                        nextAction = null;
                                        args.request.user.isDirVisible(fullPath, args.request.config.withDot).then((isVisible) => {
                                            if (isVisible) {
                                                handleDirectory(args, fullPath).then(() => {
                                                    completed();
                                                }, (err) => {
                                                    completed(err);
                                                });
                                            }
                                            else {
                                                notFound();
                                            }
                                        }, (err) => {
                                            completed(err);
                                        });
                                        break;
                                }
                            }
                            else if (stats.isFile()) {
                                nextAction = null;
                                args.request.user.isFileVisible(fullPath, args.request.user.get(rapi_host_users.VAR_WITH_DOT)).then(() => {
                                    handleFile(args, fullPath).then(() => {
                                        completed();
                                    }, (err) => {
                                        completed(err);
                                    });
                                }, (err) => {
                                    completed(err);
                                });
                            }
                            else {
                                nextAction = () => {
                                    notFound();
                                };
                            }
                            if (nextAction) {
                                nextAction();
                            }
                        }
                    });
                }
                else {
                    notFound();
                }
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
function toDirectory(dirItem, dirPath) {
    if (!dirItem) {
        return;
    }
    let newDirItem = {
        creationTime: toISODateString(dirItem.birthtime),
        lastChangeTime: toISODateString(dirItem.ctime),
        lastModifiedTime: toISODateString(dirItem.mtime),
        name: dirItem.name,
        path: '/api/workspace' + dirPath,
        type: 'dir',
    };
    return newDirItem;
}
function toFile(fileItem, canOpen, filePath) {
    if (!fileItem) {
        return;
    }
    let newFileItem = {
        creationTime: toISODateString(fileItem.birthtime),
        lastChangeTime: toISODateString(fileItem.ctime),
        lastModifiedTime: toISODateString(fileItem.mtime),
        mime: fileItem.mime,
        name: fileItem.name,
        path: '/api/workspace' + filePath,
        size: fileItem.size,
        type: 'file',
    };
    if (canOpen) {
        newFileItem.openPath = '/api/editor' + filePath;
    }
    return newFileItem;
}
function toISODateString(dt) {
    if (!dt) {
        return;
    }
    return Moment(dt).utc().toISOString();
}
function writeFile(args, fullPath) {
    let canOpen = args.request.user.can('open');
    let canWrite = args.request.user.can('write');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let forbidden = () => {
            args.sendForbidden();
            completed();
        };
        if (!canWrite) {
            args.sendNotFound();
            completed();
            return;
        }
        args.headers[exports.HEADER_FILE_TYPE] = TYPE_FILE;
        try {
            let writeBodyToFile = () => {
                try {
                    let dir = Path.dirname(fullPath);
                    let relativePath = rapi_helpers.toRelativePath(dir);
                    if (false === relativePath) {
                        forbidden();
                        return;
                    }
                    let fileName = Path.basename(fullPath);
                    let filePath = normalizePath(relativePath).split('/')
                        .concat([fileName])
                        .map(x => encodeURIComponent(x))
                        .join('/');
                    let writeBody = () => {
                        //TODO check for file visibility even if file does not exist
                        args.getBody().then((data) => {
                            FS.writeFile(fullPath, data || Buffer.alloc(0), (err) => {
                                if (err) {
                                    completed(err);
                                }
                                else {
                                    FS.stat(fullPath, (err, stats) => {
                                        if (!err) {
                                            args.response.data = toFile({
                                                birthtime: stats.birthtime,
                                                ctime: stats.ctime,
                                                fullPath: fullPath,
                                                mime: rapi_helpers.detectMimeByFilename(fileName),
                                                mtime: stats.mtime,
                                                name: fileName,
                                                size: stats.size,
                                            }, canOpen, filePath);
                                        }
                                        completed(err);
                                    });
                                }
                            });
                        }, (err) => {
                            completed(err);
                        });
                    };
                    let checkForFile = () => {
                        FS.exists(fullPath, (exists) => {
                            if (exists) {
                                FS.stat(fullPath, (err, stats) => {
                                    if (err) {
                                        completed(err);
                                    }
                                    else {
                                        if (stats.isFile()) {
                                            writeBody();
                                        }
                                        else {
                                            forbidden(); // only files
                                        }
                                    }
                                });
                            }
                            else {
                                writeBody();
                            }
                        });
                    };
                    FS.exists(dir, (exists) => {
                        if (exists) {
                            checkForFile();
                        }
                        else {
                            FSExtra.ensureDir(dir, (err) => {
                                if (err) {
                                    completed(err);
                                }
                                else {
                                    checkForFile();
                                }
                            });
                        }
                    });
                }
                catch (e) {
                    completed(e);
                }
            };
            if ('put' == args.request.method) {
                writeBodyToFile();
            }
            else if ('patch' == args.request.method) {
                FS.exists(fullPath, (exists) => {
                    if (exists) {
                        writeBodyToFile();
                    }
                    else {
                        forbidden();
                    }
                });
            }
            else {
                // POST
                FS.exists(fullPath, (exists) => {
                    if (exists) {
                        forbidden();
                    }
                    else {
                        writeBodyToFile();
                    }
                });
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.DELETE = request;
exports.GET = request;
exports.PATCH = request;
exports.POST = request;
exports.PUT = request;
//# sourceMappingURL=workspace.js.map