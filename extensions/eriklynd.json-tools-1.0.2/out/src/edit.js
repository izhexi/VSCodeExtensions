"use strict";
var vscode_1 = require('vscode');
exports.LINE_SEPERATOR = /\n|\r\n/;
exports.replaceSectionContent = function (raw, replacement, start, end) { return function (builder) {
    var lines = raw.split(exports.LINE_SEPERATOR);
    var range = new vscode_1.Range(start, end);
    builder.replace(range, replacement);
}; };
exports.replaceAllContent = function (raw, replacement) { return function (builder) {
    var start = new vscode_1.Position(0, 0);
    var lines = raw.split(exports.LINE_SEPERATOR);
    var end = new vscode_1.Position(lines.length - 1, lines[lines.length - 1].length);
    var allRange = new vscode_1.Range(start, end);
    builder.delete(allRange);
    builder.insert(start, replacement);
}; };
//# sourceMappingURL=edit.js.map