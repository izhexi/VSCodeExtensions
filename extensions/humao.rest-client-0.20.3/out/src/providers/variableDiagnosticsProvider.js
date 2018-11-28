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
const requestVariableCacheKey_1 = require("../models/requestVariableCacheKey");
const variableType_1 = require("../models/variableType");
const requestVariableCache_1 = require("../utils/requestVariableCache");
const requestVariableCacheValueProcessor_1 = require("../utils/requestVariableCacheValueProcessor");
const variableProcessor_1 = require("../utils/variableProcessor");
class VariableDiagnosticsProvider {
    constructor() {
        this.httpDiagnosticCollection = vscode_1.languages.createDiagnosticCollection();
        this.checkVariablesInAllTextDocuments();
        requestVariableCache_1.RequestVariableCache.onDidCreateNewRequestVariable(() => this.checkVariablesInAllTextDocuments());
        vscode_1.workspace.onDidChangeConfiguration(e => e.affectsConfiguration('rest-client') && this.checkVariablesInAllTextDocuments());
    }
    dispose() {
        this.httpDiagnosticCollection.clear();
        this.httpDiagnosticCollection.dispose();
    }
    deleteDocumentFromDiagnosticCollection(textDocument) {
        if (this.httpDiagnosticCollection.has(textDocument.uri)) {
            this.httpDiagnosticCollection.delete(textDocument.uri);
        }
    }
    checkVariablesInAllTextDocuments() {
        vscode_1.workspace.textDocuments.forEach(this.checkVariables, this);
    }
    checkVariables(document) {
        return __awaiter(this, void 0, void 0, function* () {
            if (document.languageId !== 'http' || document.uri.scheme !== 'file') {
                return;
            }
            const diagnostics = [];
            const allAvailableVariables = yield variableProcessor_1.VariableProcessor.getAllVariablesDefinitions(document);
            const variableReferences = this.findVariableReferences(document);
            // Variable not found
            [...variableReferences.entries()]
                .filter(([name]) => !allAvailableVariables.has(name))
                .forEach(([, variables]) => {
                variables.forEach(v => {
                    diagnostics.push(new vscode_1.Diagnostic(new vscode_1.Range(new vscode_1.Position(v.lineNumber, v.startIndex), new vscode_1.Position(v.lineNumber, v.endIndex)), `${v.variableName} is not found`, vscode_1.DiagnosticSeverity.Error));
                });
            });
            // Request variable not active
            [...variableReferences.entries()]
                .filter(([name]) => allAvailableVariables.has(name)
                && allAvailableVariables.get(name)[0] === variableType_1.VariableType.Request
                && !requestVariableCache_1.RequestVariableCache.has(new requestVariableCacheKey_1.RequestVariableCacheKey(name, document.uri.toString())))
                .forEach(([, variables]) => {
                variables.forEach(v => {
                    diagnostics.push(new vscode_1.Diagnostic(new vscode_1.Range(new vscode_1.Position(v.lineNumber, v.startIndex), new vscode_1.Position(v.lineNumber, v.endIndex)), `Request '${v.variableName}' has not been sent`, vscode_1.DiagnosticSeverity.Information));
                });
            });
            // Request variable resolve with warning or error
            [...variableReferences.entries()]
                .filter(([name]) => allAvailableVariables.has(name)
                && allAvailableVariables.get(name)[0] === variableType_1.VariableType.Request
                && requestVariableCache_1.RequestVariableCache.has(new requestVariableCacheKey_1.RequestVariableCacheKey(name, document.uri.toString())))
                .forEach(([name, variables]) => {
                const value = requestVariableCache_1.RequestVariableCache.get(new requestVariableCacheKey_1.RequestVariableCacheKey(name, document.uri.toString()));
                variables.forEach(v => {
                    const path = v.variableValue.replace(/^\{{2}\s*/, '').replace(/\s*\}{2}$/, '');
                    const result = requestVariableCacheValueProcessor_1.RequestVariableCacheValueProcessor.resolveRequestVariable(value, path);
                    if (result.state !== 0 /* Success */) {
                        diagnostics.push(new vscode_1.Diagnostic(new vscode_1.Range(new vscode_1.Position(v.lineNumber, v.startIndex), new vscode_1.Position(v.lineNumber, v.endIndex)), result.message, result.state === 2 /* Error */ ? vscode_1.DiagnosticSeverity.Error : vscode_1.DiagnosticSeverity.Warning));
                    }
                });
            });
            this.httpDiagnosticCollection.set(document.uri, diagnostics);
        });
    }
    findVariableReferences(document) {
        let vars = new Map();
        let lines = document.getText().split(Constants.LineSplitterRegex);
        let pattern = /\{\{(\w+)(\..*?)*\}\}/g;
        lines.forEach((line, lineNumber) => {
            let match;
            while (match = pattern.exec(line)) {
                const [variablePath, variableName] = match;
                const variable = new Variable(variableName, variablePath, match.index, match.index + variablePath.length, lineNumber);
                if (vars.has(variableName)) {
                    vars.get(variableName).push(variable);
                }
                else {
                    vars.set(variableName, [variable]);
                }
            }
        });
        return vars;
    }
}
exports.VariableDiagnosticsProvider = VariableDiagnosticsProvider;
class Variable {
    constructor(variableName, variableValue, startIndex, endIndex, lineNumber) {
        this.variableName = variableName;
        this.variableValue = variableValue;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.lineNumber = lineNumber;
    }
}
//# sourceMappingURL=variableDiagnosticsProvider.js.map