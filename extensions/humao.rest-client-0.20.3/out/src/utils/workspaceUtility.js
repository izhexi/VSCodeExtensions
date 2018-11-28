"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
function getWorkspaceRootPath() {
    const document = getCurrentTextDocument();
    if (document) {
        let fileUri = document.uri;
        let workspaceFolder = vscode_1.workspace.getWorkspaceFolder(fileUri);
        if (workspaceFolder) {
            return workspaceFolder.uri.toString();
        }
    }
}
exports.getWorkspaceRootPath = getWorkspaceRootPath;
function getCurrentHttpFileName() {
    const document = getCurrentTextDocument();
    if (document) {
        let filePath = document.fileName;
        return path.basename(filePath, path.extname(filePath));
    }
}
exports.getCurrentHttpFileName = getCurrentHttpFileName;
function getCurrentTextDocument() {
    const editor = vscode_1.window.activeTextEditor;
    return editor && editor.document;
}
exports.getCurrentTextDocument = getCurrentTextDocument;
//# sourceMappingURL=workspaceUtility.js.map