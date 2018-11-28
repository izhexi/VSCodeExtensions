"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const Constants = __importStar(require("../common/constants"));
class Selector {
    getSelectedText(editor, range = null) {
        if (!editor || !editor.document) {
            return null;
        }
        let selectedText;
        if (editor.selection.isEmpty || range) {
            let activeLine = !range ? editor.selection.active.line : range.start.line;
            selectedText = this.getDelimitedText(editor.document.getText(), activeLine);
        }
        else {
            selectedText = editor.document.getText(editor.selection);
        }
        return selectedText;
    }
    static getDelimiterRows(lines) {
        let rows = [];
        for (let index = 0; index < lines.length; index++) {
            if (lines[index].match(/^#{3,}/)) {
                rows.push(index);
            }
        }
        return rows;
    }
    static getRequestVariableDefinitionName(text) {
        const matched = text.match(Constants.RequestVariableDefinitionRegex);
        return matched && matched[1];
    }
    static isCommentLine(line) {
        return Constants.CommentIdentifiersRegex.test(line);
    }
    static isEmptyLine(line) {
        return line.trim() === '';
    }
    static isVariableDefinitionLine(line) {
        return Constants.FileVariableDefinitionRegex.test(line);
    }
    static isResponseStatusLine(line) {
        return Selector.responseStatusLineRegex.test(line);
    }
    getDelimitedText(fullText, currentLine) {
        let lines = fullText.split(Constants.LineSplitterRegex);
        let delimiterLineNumbers = Selector.getDelimiterRows(lines);
        if (delimiterLineNumbers.length === 0) {
            return fullText;
        }
        // return null if cursor is in delimiter line
        if (delimiterLineNumbers.includes(currentLine)) {
            return null;
        }
        if (currentLine < delimiterLineNumbers[0]) {
            return lines.slice(0, delimiterLineNumbers[0]).join(os_1.EOL);
        }
        if (currentLine > delimiterLineNumbers[delimiterLineNumbers.length - 1]) {
            return lines.slice(delimiterLineNumbers[delimiterLineNumbers.length - 1] + 1).join(os_1.EOL);
        }
        for (let index = 0; index < delimiterLineNumbers.length - 1; index++) {
            let start = delimiterLineNumbers[index];
            let end = delimiterLineNumbers[index + 1];
            if (start < currentLine && currentLine < end) {
                return lines.slice(start + 1, end).join(os_1.EOL);
            }
        }
    }
}
Selector.responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;
exports.Selector = Selector;
//# sourceMappingURL=selector.js.map