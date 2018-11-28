"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
const dart_diagnostic_provider_1 = require("./dart_diagnostic_provider");
class IgnoreLintCodeActionProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.metadata = {
            providedCodeActionKinds: [vscode_1.CodeActionKind.QuickFix],
        };
    }
    provideCodeActions(document, range, context, token) {
        if (!utils_1.isAnalyzableAndInWorkspace(document))
            return null;
        if (!config_1.config.showIgnoreQuickFixes || !context || !context.diagnostics || !context.diagnostics.length)
            return null;
        const lintErrors = context.diagnostics.filter((d) => d instanceof dart_diagnostic_provider_1.DartDiagnostic && (d.type === "LINT" || d.type === "HINT"));
        if (!lintErrors.length)
            return null;
        return lintErrors.map((diagnostic) => this.convertResult(document, diagnostic));
    }
    convertResult(document, diagnostic) {
        const edit = new vscode_1.WorkspaceEdit();
        const line = document.lineAt(diagnostic.range.start.line);
        edit.insert(document.uri, line.range.start, `${" ".repeat(line.firstNonWhitespaceCharacterIndex)}// ignore: ${diagnostic.code}\n`);
        const title = `Ignore ${diagnostic.type.toLowerCase()} '${diagnostic.code}' for this line`;
        const action = new vscode_1.CodeAction(title, vscode_1.CodeActionKind.QuickFix);
        action.edit = edit;
        return action;
    }
}
exports.IgnoreLintCodeActionProvider = IgnoreLintCodeActionProvider;
//# sourceMappingURL=ignore_lint_code_action_provider.js.map