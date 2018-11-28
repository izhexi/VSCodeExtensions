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
const variableType_1 = require("../models/variableType");
const environmentVariableProvider_1 = require("./httpVariableProviders/environmentVariableProvider");
const fileVariableProvider_1 = require("./httpVariableProviders/fileVariableProvider");
const requestVariableProvider_1 = require("./httpVariableProviders/requestVariableProvider");
const systemVariableProvider_1 = require("./httpVariableProviders/systemVariableProvider");
class VariableProcessor {
    static processRawRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
            let result = '';
            let match;
            let lastIndex = 0;
            variable: while (match = variableReferenceRegex.exec(request)) {
                result += request.substring(lastIndex, match.index);
                lastIndex = variableReferenceRegex.lastIndex;
                const name = match[1].trim();
                const document = vscode_1.window.activeTextEditor.document;
                const context = { rawRequest: request, parsedRequest: result };
                for (const provider of VariableProcessor.providers) {
                    if (yield provider.has(document, name, context)) {
                        const { value, error, warning } = yield provider.get(document, name, context);
                        if (!error && !warning) {
                            result += value;
                            continue variable;
                        }
                        else {
                            break;
                        }
                    }
                }
                result += `{{${name}}}`;
            }
            result += request.substring(lastIndex);
            return result;
        });
    }
    static getAllVariablesDefinitions(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const [, requestProvider, fileProvider, environmentProvider] = VariableProcessor.providers;
            const requestVariables = yield requestProvider.getAll(document);
            const fileVariables = yield fileProvider.getAll(document);
            const environmentVariables = yield environmentProvider.getAll(document);
            const variableDefinitions = new Map();
            // Request variables in file
            requestVariables.forEach(({ name }) => {
                if (variableDefinitions.has(name)) {
                    variableDefinitions.get(name).push(variableType_1.VariableType.Request);
                }
                else {
                    variableDefinitions.set(name, [variableType_1.VariableType.Request]);
                }
            });
            // Normal file variables
            fileVariables.forEach(({ name }) => {
                if (variableDefinitions.has(name)) {
                    variableDefinitions.get(name).push(variableType_1.VariableType.File);
                }
                else {
                    variableDefinitions.set(name, [variableType_1.VariableType.File]);
                }
            });
            // Environment variables
            environmentVariables.forEach(({ name }) => {
                if (variableDefinitions.has(name)) {
                    variableDefinitions.get(name).push(variableType_1.VariableType.Environment);
                }
                else {
                    variableDefinitions.set(name, [variableType_1.VariableType.Environment]);
                }
            });
            return variableDefinitions;
        });
    }
}
VariableProcessor.providers = [
    systemVariableProvider_1.SystemVariableProvider.Instance,
    requestVariableProvider_1.RequestVariableProvider.Instance,
    fileVariableProvider_1.FileVariableProvider.Instance,
    environmentVariableProvider_1.EnvironmentVariableProvider.Instance,
];
exports.VariableProcessor = VariableProcessor;
//# sourceMappingURL=variableProcessor.js.map