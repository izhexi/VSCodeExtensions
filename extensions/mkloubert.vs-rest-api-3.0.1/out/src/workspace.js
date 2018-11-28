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
const vscode = require("vscode");
let currentFolder = false;
/**
 * Returns the root path of the selected workspace folder.
 *
 * @return {string} The root path.
 */
function getRootPath() {
    let folder;
    if (false === currentFolder) {
        if (vscode.workspace.workspaceFolders) {
            if (vscode.workspace.workspaceFolders.length > 0) {
                folder = vscode.workspace.workspaceFolders[0];
            }
        }
    }
    else {
        folder = currentFolder;
    }
    let workspace_root;
    if (folder) {
        workspace_root = vscode.workspace.getWorkspaceFolder(folder.uri)
            .uri
            .fsPath;
    }
    else {
        try {
            workspace_root = vscode.workspace.rootPath;
        }
        catch (e) {
            //TODO: log
            workspace_root = undefined;
        }
    }
    if ('undefined' !== typeof workspace_root) {
        return Path.resolve(workspace_root);
    }
}
exports.getRootPath = getRootPath;
/**
 * Resets the selected workspace folder.
 */
function resetSelectedWorkspaceFolder() {
    currentFolder = false;
}
exports.resetSelectedWorkspaceFolder = resetSelectedWorkspaceFolder;
//# sourceMappingURL=workspace.js.map