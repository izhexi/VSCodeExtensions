"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
function isDartDocument(document) {
    return document && document.languageId === "dart";
}
exports.isDartDocument = isDartDocument;
function getActiveDartEditor() {
    const editor = vs.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "dart")
        return undefined;
    return editor;
}
exports.getActiveDartEditor = getActiveDartEditor;
//# sourceMappingURL=editors.js.map