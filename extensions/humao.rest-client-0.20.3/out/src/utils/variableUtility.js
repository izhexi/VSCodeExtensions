'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const Constants = __importStar(require("../common/constants"));
class VariableUtility {
    static isVariableDefinition(document, position) {
        let wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);
        if (!wordRange
            || wordRange.start.character < 1
            || lineRange.text[wordRange.start.character - 1] !== '@') {
            // not a custom variable definition syntax
            return false;
        }
        return true;
    }
    static isVariableReference(document, position) {
        let wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);
        return VariableUtility.isVariableReferenceFromLine(wordRange, lineRange);
    }
    static isRequestVariableReference(document, position) {
        let wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(response|request)?(\.body(\..*?)?|\.headers(\.[\w-]+)?)?\}\}/);
        return wordRange && !wordRange.isEmpty;
    }
    static isPartialRequestVariableReference(document, position) {
        let wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        return wordRange && !wordRange.isEmpty;
    }
    static isVariableReferenceFromLine(wordRange, lineRange) {
        if (!wordRange
            || wordRange.start.character < 2
            || wordRange.end.character > lineRange.range.end.character - 1
            || lineRange.text[wordRange.start.character - 1] !== '{'
            || lineRange.text[wordRange.start.character - 2] !== '{'
            || lineRange.text[wordRange.end.character] !== '}'
            || lineRange.text[wordRange.end.character + 1] !== '}') {
            // not a custom variable reference syntax
            return false;
        }
        return true;
    }
    static getDefinitionRanges(lines, variable) {
        let locations = [];
        for (const [index, line] of lines.entries()) {
            let match;
            if ((match = Constants.FileVariableDefinitionRegex.exec(line)) && match[1] === variable) {
                let startPos = line.indexOf(`@${variable}`);
                let endPos = startPos + variable.length + 1;
                locations.push(new vscode_1.Range(index, startPos, index, endPos));
            }
        }
        return locations;
    }
    static getReferenceRanges(lines, variable) {
        const locations = [];
        const regex = new RegExp(`\{\{${variable}\}\}`, 'g');
        for (const [index, line] of lines.entries()) {
            if (Constants.CommentIdentifiersRegex.test(line)) {
                continue;
            }
            regex.lastIndex = 0;
            let match;
            while (match = regex.exec(line)) {
                let startPos = match.index + 2;
                let endPos = startPos + variable.length;
                locations.push(new vscode_1.Range(index, startPos, index, endPos));
                regex.lastIndex = match.index + 1;
            }
        }
        return locations;
    }
}
exports.VariableUtility = VariableUtility;
//# sourceMappingURL=variableUtility.js.map