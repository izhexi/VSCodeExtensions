'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const requestVariableProvider_1 = require("../utils/httpVariableProviders/requestVariableProvider");
const variableUtility_1 = require("../utils/variableUtility");
class RequestVariableHoverProvider {
    provideHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!variableUtility_1.VariableUtility.isRequestVariableReference(document, position)) {
                return;
            }
            const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
            let lineRange = document.lineAt(position);
            const fullPath = this.getRequestVariableHoverPath(wordRange, lineRange);
            const { name, value, warning, error } = yield requestVariableProvider_1.RequestVariableProvider.Instance.get(document, fullPath);
            if (!error && !warning) {
                const contents = [];
                if (value) {
                    contents.push(typeof value !== "object" ? value : { language: 'json', value: JSON.stringify(value, null, 2) });
                }
                contents.push(new vscode_1.MarkdownString(`*Request Variable* \`${name}\``));
                return new vscode_1.Hover(contents, wordRange);
            }
            return;
        });
    }
    getRequestVariableHoverPath(wordRange, lineRange) {
        return wordRange && !wordRange.isEmpty
            ? lineRange.text.substring(wordRange.start.character + 2, wordRange.end.character - 2)
            : null;
    }
}
exports.RequestVariableHoverProvider = RequestVariableHoverProvider;
//# sourceMappingURL=requestVariableHoverProvider.js.map