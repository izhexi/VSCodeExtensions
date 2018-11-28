"use strict";
var vscode = require('vscode');
var edit_1 = require('./edit');
var format_1 = require('./format');
var makeCommand = function (transform) { return function () {
    var editor = vscode.window.activeTextEditor;
    var builder;
    if (editor.selection.isEmpty) {
        var text = editor.document.getText();
        var processedText = transform(text);
        builder = edit_1.replaceAllContent(text, processedText);
    }
    else {
        var text = editor.document.getText(editor.selection);
        var processedText = transform(text);
        builder = edit_1.replaceSectionContent(text, processedText, editor.selection.start, editor.selection.end);
    }
    vscode.window.activeTextEditor.edit(builder);
}; };
function activate(context) {
    var disposablePrettyJSON = vscode.commands.registerCommand('extension.prettyJSON', makeCommand(format_1.prettyJSON));
    context.subscriptions.push(disposablePrettyJSON);
    var disposableMinifyJSON = vscode.commands.registerCommand('extension.minifyJSON', makeCommand(format_1.minifyJSON));
    context.subscriptions.push(disposableMinifyJSON);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map