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
const rapi_contracts = require("../contracts");
const rapi_helpers = require("../helpers");
// [DELETE] /state/{name}
function DELETE(args) {
    let canDelete = args.request.user.can('delete');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canDelete) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let name = getVarName(args);
            let item = getRepoItem(args);
            let exists = item.item.hasOwnProperty(name);
            let oldValue = item.item[name];
            delete item.item[name];
            args.extension.workspaceState.update(rapi_contracts.VAR_STATE, item.repository);
            args.response.data = {};
            if (exists) {
                args.response.data['old'] = oldValue;
            }
            completed();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.DELETE = DELETE;
// [GET] /state
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        try {
            let item = getRepoItem(args);
            args.response.data = item.item;
            completed();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.GET = GET;
function getRepoItem(args) {
    let item = {
        item: undefined,
        repository: rapi_helpers.getStateRepository(args.extension.workspaceState, rapi_contracts.VAR_STATE),
    };
    if (args.request.user.isGuest) {
        item.item = item.repository.guest;
    }
    else {
        let user = args.request.user;
        let username = rapi_helpers.normalizeString(user.name);
        if (!item.repository.users[username]) {
            item.repository.users[username] = {};
        }
        item.item = item.repository.users[username];
    }
    return item;
}
function getVarName(args) {
    let name;
    let parts = args.path.split('/');
    if (parts.length > 1) {
        name = parts[1];
    }
    return rapi_helpers.normalizeString(name);
}
// [PUT] /state/{name}
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
            let name = getVarName(args);
            let item = getRepoItem(args);
            args.getJSON().then((newValue) => {
                try {
                    let isNew = !item.item.hasOwnProperty(name);
                    let oldValue = item.item[name];
                    item.item[name] = newValue;
                    args.extension.workspaceState.update(rapi_contracts.VAR_STATE, item.repository);
                    args.response.data = {
                        isNew: isNew,
                        new: newValue,
                        old: oldValue,
                    };
                    completed();
                }
                catch (e) {
                    completed(e);
                }
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.PUT = PUT;
//# sourceMappingURL=state.js.map