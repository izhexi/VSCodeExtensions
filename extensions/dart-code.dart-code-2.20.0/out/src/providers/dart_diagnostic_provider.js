"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
// TODO: This is not a provider?
class DartDiagnosticProvider {
    constructor(analyzer, diagnostics) {
        this.analyzer = analyzer;
        this.diagnostics = diagnostics;
        this.analyzer.registerForAnalysisErrors((es) => this.handleErrors(es));
        // Fired when files are deleted
        this.analyzer.registerForAnalysisFlushResults((es) => this.flushResults(es));
    }
    handleErrors(notification) {
        let errors = notification.errors;
        if (!config_1.config.showTodos)
            errors = errors.filter((error) => error.type !== "TODO");
        this.diagnostics.set(vscode_1.Uri.file(notification.file), errors.map((e) => DartDiagnosticProvider.createDiagnostic(e)));
    }
    static createDiagnostic(error) {
        const diag = new DartDiagnostic(utils_1.toRangeOnLine(error.location), error.message, DartDiagnosticProvider.getSeverity(error.severity, error.type));
        diag.code = error.code;
        diag.source = "dart";
        diag.tags = DartDiagnosticProvider.getTags(error);
        diag.type = error.type;
        return diag;
    }
    static getSeverity(severity, type) {
        switch (severity) {
            case "ERROR":
                return vscode_1.DiagnosticSeverity.Error;
            case "WARNING":
                return vscode_1.DiagnosticSeverity.Warning;
            case "INFO":
                switch (type) {
                    case "TODO":
                        return vscode_1.DiagnosticSeverity.Information; // https://github.com/Microsoft/vscode/issues/48376
                    default:
                        return vscode_1.DiagnosticSeverity.Information;
                }
            default:
                throw new Error("Unknown severity type: " + severity);
        }
    }
    static getTags(error) {
        const tags = [];
        if (error.code === "dead_code" || error.code === "unused_local_variable" || error.code === "unused_import")
            tags.push(vscode_1.DiagnosticTag.Unnecessary);
        return tags;
    }
    flushResults(notification) {
        const entries = notification.files.map((file) => [vscode_1.Uri.file(file), undefined]);
        this.diagnostics.set(entries);
    }
}
exports.DartDiagnosticProvider = DartDiagnosticProvider;
class DartDiagnostic extends vscode_1.Diagnostic {
}
exports.DartDiagnostic = DartDiagnostic;
//# sourceMappingURL=dart_diagnostic_provider.js.map