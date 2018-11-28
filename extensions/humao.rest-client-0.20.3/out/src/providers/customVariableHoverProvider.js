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
const environmentVariableProvider_1 = require("../utils/httpVariableProviders/environmentVariableProvider");
const fileVariableProvider_1 = require("../utils/httpVariableProviders/fileVariableProvider");
const variableUtility_1 = require("../utils/variableUtility");
class CustomVariableHoverProvider {
    provideHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!variableUtility_1.VariableUtility.isVariableReference(document, position)) {
                return;
            }
            let wordRange = document.getWordRangeAtPosition(position);
            let selectedVariableName = document.getText(wordRange);
            if (yield fileVariableProvider_1.FileVariableProvider.Instance.has(document, selectedVariableName)) {
                const { name, value, error, warning } = yield fileVariableProvider_1.FileVariableProvider.Instance.get(document, selectedVariableName);
                if (!warning && !error) {
                    const contents = [value, new vscode_1.MarkdownString(`*File Variable* \`${name}\``)];
                    return new vscode_1.Hover(contents, wordRange);
                }
                return;
            }
            if (yield environmentVariableProvider_1.EnvironmentVariableProvider.Instance.has(document, selectedVariableName)) {
                const { name, value, error, warning } = yield environmentVariableProvider_1.EnvironmentVariableProvider.Instance.get(document, selectedVariableName);
                if (!warning && !error) {
                    const contents = [value, new vscode_1.MarkdownString(`*Environment Variable* \`${name}\``)];
                    return new vscode_1.Hover(contents, wordRange);
                }
                return;
            }
            return;
        });
    }
}
exports.CustomVariableHoverProvider = CustomVariableHoverProvider;
//# sourceMappingURL=customVariableHoverProvider.js.map