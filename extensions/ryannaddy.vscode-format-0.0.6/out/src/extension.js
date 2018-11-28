"use strict";
var vscode_1 = require('vscode');
var format_1 = require('./format');
// Get global configuration settings
var config = vscode_1.workspace.getConfiguration('format');
var onType = config.get('onType', true);
var disabled = config.get('disabled');
var workspaceDisabled = config.get('workspaceDisabled', false);
// Update the configuration settings if the configuration changes
vscode_1.workspace.onDidChangeConfiguration(function (e) {
    config = vscode_1.workspace.getConfiguration('format');
    onType = config.get('onType', true);
    disabled = config.get('disabled');
    workspaceDisabled = config.get('workspaceDisabled', false);
});
vscode_1.workspace.onDidOpenTextDocument(function (document) {
    console.log("Document Id: " + document.languageId);
});
// Format the code on type
var DocumentTypeFormat = (function () {
    function DocumentTypeFormat() {
    }
    DocumentTypeFormat.prototype.provideOnTypeFormattingEdits = function (document, position, ch, options, token) {
        // Don't format if onType is disabled
        if (!onType) {
            return;
        }
        // Don't format if the language is in the disabled list
        if (disabled.indexOf(document.languageId) > -1 || workspaceDisabled) {
            return;
        }
        // Format the document
        return format(document, null, options);
    };
    return DocumentTypeFormat;
}());
// Format the code when the format keybindings are pressed
var DocumentFormat = (function () {
    function DocumentFormat() {
    }
    DocumentFormat.prototype.provideDocumentFormattingEdits = function (document, options, token) {
        // Don't format if the language is in the disabled list
        if (disabled.indexOf(document.languageId) > -1 || workspaceDisabled) {
            return;
        }
        // Format the document
        return format(document, null, options);
    };
    return DocumentFormat;
}());
// Execute the format edits
function format(document, range, options) {
    return new Promise(function (resolve) {
        // Create an empty list of changes
        var result = [];
        // Create a full document range
        if (range === null) {
            var start = new vscode_1.Position(0, 0);
            var end = new vscode_1.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            range = new vscode_1.Range(start, end);
        }
        // Format the document with the user specified settings
        var newText = format_1.Format.document(document.getText(), options, document.languageId);
        // Push the edit into the result array
        result.push(new vscode_1.TextEdit(range, newText));
        // Return the result of the change
        return resolve(result);
    });
}
// When the extention gets activated
function activate(context) {
    console.log('Activating vscode-format');
    // Set the document filter to files
    var docFilter = { scheme: 'file' };
    // Register the format provider
    context.subscriptions.push(vscode_1.languages.registerDocumentFormattingEditProvider(docFilter, new DocumentFormat()));
    // Register the onType format provider
    context.subscriptions.push(vscode_1.languages.registerOnTypeFormattingEditProvider(docFilter, new DocumentTypeFormat(), '\n', '\r\n', ';'));
    // context.subscriptions.push(commands.registerCommand('format.workspace', function () {
    // 	workspace.findFiles('**/*.*', '').then();
    // }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map