'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const httpElement_1 = require("../models/httpElement");
const requestVariableProvider_1 = require("../utils/httpVariableProviders/requestVariableProvider");
const requestVariableCacheValueProcessor_1 = require("../utils/requestVariableCacheValueProcessor");
const variableUtility_1 = require("../utils/variableUtility");
const firstPartRegex = /^(\w+)\.$/;
const secondPartRegex = /^(\w+)\.(request|response)\.$/;
class RequestVariableCompletionItemProvider {
    provideCompletionItems(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!variableUtility_1.VariableUtility.isPartialRequestVariableReference(document, position)) {
                return [];
            }
            const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
            let lineRange = document.lineAt(position);
            let fullPath = this.getRequestVariableCompletionPath(wordRange, lineRange, position);
            if (!fullPath) {
                return undefined;
            }
            const match = fullPath.match(/(\w+)\.(.*?)?/);
            if (!match || !this.checkIfRequestVariableDefined(document, match[1])) {
                return [];
            }
            if (firstPartRegex.test(fullPath)) {
                return [
                    new vscode_1.CompletionItem("request", vscode_1.CompletionItemKind.Field),
                    new vscode_1.CompletionItem("response", vscode_1.CompletionItemKind.Field),
                ];
            }
            else if (secondPartRegex.test(fullPath)) {
                return [
                    new vscode_1.CompletionItem("body", vscode_1.CompletionItemKind.Field),
                    new vscode_1.CompletionItem("headers", vscode_1.CompletionItemKind.Field),
                ];
            }
            const requestVariables = yield requestVariableProvider_1.RequestVariableProvider.Instance.getAll(document);
            for (const { name, value } of requestVariables) {
                // Only add completion items for headers
                let regex = new RegExp(`^(${name})\.(?:request|response)\.headers\.$`);
                let match;
                if (match = regex.exec(fullPath)) {
                    // Remove last dot if present
                    fullPath = fullPath.replace(/\.$/, '');
                    const result = requestVariableCacheValueProcessor_1.RequestVariableCacheValueProcessor.resolveRequestVariable(value, fullPath);
                    if (result.state === 1 /* Warning */ && result.message === "Header name should be provided right after \"headers\"" /* MissingHeaderName */) {
                        const { value } = result;
                        return Object.keys(value).map(p => {
                            let item = new vscode_1.CompletionItem(p);
                            item.detail = `HTTP ${httpElement_1.ElementType[httpElement_1.ElementType.RequestCustomVariable]}`;
                            item.documentation = new vscode_1.MarkdownString(`Value: \`${value[p]}\``);
                            item.insertText = p;
                            item.kind = vscode_1.CompletionItemKind.Field;
                            return item;
                        });
                    }
                }
            }
            return;
        });
    }
    checkIfRequestVariableDefined(document, variableName) {
        const text = document.getText();
        const regex = new RegExp(Constants.RequestVariableDefinitionWithNameRegexFactory(variableName, "m"));
        return regex.test(text);
    }
    getRequestVariableCompletionPath(wordRange, lineRange, position) {
        // Look behind for start of variable or first dot
        let isFirst = false;
        let index = position.character;
        let forwardIndex = position.character;
        for (; index >= 0; index--) {
            if (lineRange.text[index - 1] === "{" && lineRange.text[index - 2] === "{") {
                isFirst = true;
                // Is first word, find end of word
                for (; forwardIndex <= wordRange.end.character; forwardIndex++) {
                    if (lineRange.text[forwardIndex] === ".") {
                        break;
                    }
                }
                break;
            }
            if (lineRange.text[index - 1] === ".") {
                break;
            }
        }
        if (isFirst) {
            return lineRange.text.substring(index, forwardIndex);
        }
        else {
            return lineRange.text.substring(wordRange.start.character + 2, index);
        }
    }
}
exports.RequestVariableCompletionItemProvider = RequestVariableCompletionItemProvider;
//# sourceMappingURL=requestVariableCompletionItemProvider.js.map