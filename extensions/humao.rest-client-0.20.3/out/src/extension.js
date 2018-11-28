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
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode_1 = require("vscode");
const codeSnippetController_1 = require("./controllers/codeSnippetController");
const environmentController_1 = require("./controllers/environmentController");
const historyController_1 = require("./controllers/historyController");
const requestController_1 = require("./controllers/requestController");
const responseController_1 = require("./controllers/responseController");
const customVariableDefinitionProvider_1 = require("./providers/customVariableDefinitionProvider");
const customVariableHoverProvider_1 = require("./providers/customVariableHoverProvider");
const customVariableReferenceProvider_1 = require("./providers/customVariableReferenceProvider");
const customVariableReferencesCodeLensProvider_1 = require("./providers/customVariableReferencesCodeLensProvider");
const documentLinkProvider_1 = require("./providers/documentLinkProvider");
const httpCodeLensProvider_1 = require("./providers/httpCodeLensProvider");
const httpCompletionItemProvider_1 = require("./providers/httpCompletionItemProvider");
const httpDocumentSymbolProvider_1 = require("./providers/httpDocumentSymbolProvider");
const requestVariableCompletionItemProvider_1 = require("./providers/requestVariableCompletionItemProvider");
const requestVariableHoverProvider_1 = require("./providers/requestVariableHoverProvider");
const variableDiagnosticsProvider_1 = require("./providers/variableDiagnosticsProvider");
const aadTokenCache_1 = require("./utils/aadTokenCache");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let requestController = new requestController_1.RequestController();
        let historyController = new historyController_1.HistoryController();
        let responseController = new responseController_1.ResponseController();
        let codeSnippetController = new codeSnippetController_1.CodeSnippetController();
        let environmentController = new environmentController_1.EnvironmentController(yield environmentController_1.EnvironmentController.getCurrentEnvironment());
        context.subscriptions.push(requestController);
        context.subscriptions.push(historyController);
        context.subscriptions.push(responseController);
        context.subscriptions.push(codeSnippetController);
        context.subscriptions.push(environmentController);
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.request', ((document, range) => requestController.run(range))));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.rerun-last-request', () => requestController.rerun()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.cancel-request', () => requestController.cancel()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.history', () => historyController.save()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.clear-history', () => historyController.clear()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.save-response', () => responseController.save()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.save-response-body', () => responseController.saveBody()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.generate-codesnippet', () => codeSnippetController.run()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.copy-codesnippet', () => codeSnippetController.copy()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.copy-request-as-curl', () => codeSnippetController.copyAsCurl()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.switch-environment', () => environmentController.switchEnvironment()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client.clear-aad-token-cache', () => aadTokenCache_1.AadTokenCache.clear()));
        context.subscriptions.push(vscode_1.commands.registerCommand('rest-client._openDocumentLink', args => {
            vscode_1.workspace.openTextDocument(vscode_1.Uri.parse(args.path)).then(vscode_1.window.showTextDocument, error => {
                vscode_1.window.showErrorMessage(error.message);
            });
        }));
        const documentSelector = [
            { language: 'http', scheme: 'file' },
            { language: 'http', scheme: 'untitled' },
        ];
        context.subscriptions.push(vscode_1.languages.registerCompletionItemProvider(documentSelector, new httpCompletionItemProvider_1.HttpCompletionItemProvider()));
        context.subscriptions.push(vscode_1.languages.registerCompletionItemProvider(documentSelector, new requestVariableCompletionItemProvider_1.RequestVariableCompletionItemProvider(), '.'));
        context.subscriptions.push(vscode_1.languages.registerHoverProvider(documentSelector, new customVariableHoverProvider_1.CustomVariableHoverProvider()));
        context.subscriptions.push(vscode_1.languages.registerHoverProvider(documentSelector, new requestVariableHoverProvider_1.RequestVariableHoverProvider()));
        context.subscriptions.push(vscode_1.languages.registerCodeLensProvider(documentSelector, new httpCodeLensProvider_1.HttpCodeLensProvider()));
        context.subscriptions.push(vscode_1.languages.registerCodeLensProvider(documentSelector, new customVariableReferencesCodeLensProvider_1.CustomVariableReferencesCodeLensProvider()));
        context.subscriptions.push(vscode_1.languages.registerDocumentLinkProvider(documentSelector, new documentLinkProvider_1.RequestBodyDocumentLinkProvider()));
        context.subscriptions.push(vscode_1.languages.registerDefinitionProvider(documentSelector, new customVariableDefinitionProvider_1.CustomVariableDefinitionProvider()));
        context.subscriptions.push(vscode_1.languages.registerReferenceProvider(documentSelector, new customVariableReferenceProvider_1.CustomVariableReferenceProvider()));
        context.subscriptions.push(vscode_1.languages.registerDocumentSymbolProvider(documentSelector, new httpDocumentSymbolProvider_1.HttpDocumentSymbolProvider()));
        const diagnosticsProviders = new variableDiagnosticsProvider_1.VariableDiagnosticsProvider();
        vscode_1.workspace.onDidOpenTextDocument(diagnosticsProviders.checkVariables, diagnosticsProviders, context.subscriptions);
        vscode_1.workspace.onDidCloseTextDocument(diagnosticsProviders.deleteDocumentFromDiagnosticCollection, diagnosticsProviders, context.subscriptions);
        vscode_1.workspace.onDidSaveTextDocument(diagnosticsProviders.checkVariables, diagnosticsProviders, context.subscriptions);
    });
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map