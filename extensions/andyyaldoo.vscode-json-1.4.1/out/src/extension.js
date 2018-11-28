"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const json_helper_1 = require("./json-helper");
function activate(context) {
    let jsonHelper = new json_helper_1.default();
    /**
     * This function is used to set the current document text
     * @param newText
     */
    let setText = (editor, newText) => {
        let doc = editor.document;
        editor.edit(builder => {
            let start, end;
            // Format whole file or selected text
            if (editor.selection.isEmpty) {
                const lastLine = doc.lineAt(doc.lineCount - 1);
                start = new vscode_1.Position(0, 0);
                end = new vscode_1.Position(doc.lineCount - 1, lastLine.text.length);
            }
            else {
                start = editor.selection.start;
                end = editor.selection.end;
            }
            // replace text
            builder.replace(new vscode_1.Range(start, end), newText);
            // Select the whole json
            editor.selection = new vscode_1.Selection(start, end);
        });
    };
    /**
     * validateJson
     */
    let validateJson = vscode_1.commands.registerCommand("extension.validateJson", () => {
        // Get active editor
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Get the document
        let doc = editor.document;
        let text = doc.getText(editor.selection) || doc.getText();
        // Remove trailing and leading whitespace
        let trimmedText = text.trim().replace(/(?:^[\n\t\r]|[\n\t\r]$)/g, "");
        // Determine whether JSON is valid or invalid
        jsonHelper.isValid(trimmedText)
            ? vscode_1.window.showInformationMessage("Valid JSON")
            : vscode_1.window.showErrorMessage("Invalid JSON");
    });
    /**
     * escapeJson
     */
    let escapeJson = vscode_1.commands.registerCommand("extension.escapeJson", () => {
        // Get active editor
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Get the document
        let doc = editor.document;
        let text = doc.getText(editor.selection) || doc.getText();
        // Remove trailing and leading whitespace
        let trimmedText = text.trim().replace(/(?:^[\n\t\r]|[\n\t\r]$)/g, "");
        // Escape JSON
        let escapedJson = jsonHelper.escape(trimmedText);
        if (escapedJson !== trimmedText) {
            setText(editor, escapedJson);
        }
    });
    /**
     * unescapeJson
     */
    let unescapeJson = vscode_1.commands.registerCommand("extension.unescapeJson", () => {
        // Get active editor
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Get the document
        let doc = editor.document;
        let text = doc.getText(editor.selection) || doc.getText();
        // Remove trailing and leading whitespace
        let trimmedText = text.trim().replace(/(?:^[\n\t\r]|[\n\t\r]$)/g, "");
        // Unescape JSON
        let unescapedJson = jsonHelper.unescape(trimmedText);
        if (unescapedJson !== trimmedText) {
            setText(editor, unescapedJson);
        }
    });
    /**
     * beautifyJson
     */
    let beautifyJson = vscode_1.commands.registerCommand("extension.beautifyJson", () => {
        // Get active editor
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Get the document
        let doc = editor.document;
        let text = doc.getText(editor.selection) || doc.getText();
        // Remove trailing and leading whitespace
        let trimmedText = text.trim().replace(/(?:^[\n\t\r]|[\n\t\r]$)/g, "");
        // Beautify JSON
        let beautifiedJson = jsonHelper.beautify(trimmedText, 
        // tabs vs spaces
        editor.options.insertSpaces ? editor.options.tabSize : "\t");
        if (beautifiedJson !== trimmedText) {
            // tabs vs spaces
            let tabStyle = editor.options.insertSpaces ? " " : "\t";
            if (!editor.selection.isEmpty) {
                let start = editor.selection.start;
                beautifiedJson = beautifiedJson.replace(/(\n)/g, "$1" + tabStyle.repeat(start.character));
            }
            setText(editor, beautifiedJson);
        }
    });
    /**
     * uglifyJson
     */
    let uglifyJson = vscode_1.commands.registerCommand("extension.uglifyJson", () => {
        // Get active editor
        let editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Get the document
        let doc = editor.document;
        let text = doc.getText(editor.selection) || doc.getText();
        // Remove trailing and leading whitespace
        let trimmedText = text.trim().replace(/(?:^[\n\t\r]|[\n\t\r]$)/g, "");
        // Uglify JSON
        let uglifiedJson = jsonHelper.uglify(trimmedText);
        if (uglifiedJson !== trimmedText) {
            setText(editor, uglifiedJson);
        }
    });
    context.subscriptions.push(jsonHelper);
    context.subscriptions.push(validateJson);
    context.subscriptions.push(beautifyJson);
    context.subscriptions.push(uglifyJson);
    context.subscriptions.push(escapeJson);
    context.subscriptions.push(unescapeJson);
}
exports.activate = activate;
/**
 * This method is called when this extension is deactivated
 */
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map