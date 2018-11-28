"use strict";
var vscode = require('vscode');
var JSONBigInt = require('json-bigint');
var stringifySorted = require('json-stable-stringify');
var stringify = JSONBigInt.stringify.bind(JSONBigInt);
var minify = require('jsonminify');
var parse = JSONBigInt.parse.bind(JSONBigInt);
var getIndent = function () {
    var convertTab = vscode.workspace.getConfiguration().get('editor.insertSpaces');
    var tabSize = Number(vscode.workspace.getConfiguration().get('editor.tabSize'));
    return convertTab ? ' '.repeat(tabSize) : '\t';
};
var tryParseJSON = function (text) {
    try {
        return parse(text);
    }
    catch (e) {
        vscode.window.showWarningMessage("JSON Tools: " + e.name + " at character " + e.at + " near \"" + e.text + "\"");
        throw e;
    }
};
exports.prettyJSON = function (text) {
    try {
        var obj = tryParseJSON(text);
        return stringify(obj, null, getIndent());
    }
    catch (e) {
        return text;
    }
};
exports.minifyJSON = function (text) {
    try {
        tryParseJSON(text);
        return minify(text);
    }
    catch (e) {
        return text;
    }
};
//# sourceMappingURL=format.js.map