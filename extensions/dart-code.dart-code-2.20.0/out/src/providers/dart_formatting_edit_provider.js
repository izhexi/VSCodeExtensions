"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimatch = require("minimatch");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
const log_1 = require("../utils/log");
class DartFormattingEditProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDocumentFormattingEdits(document, options, token) {
        return this.doFormat(document, true);
    }
    provideOnTypeFormattingEdits(document, position, ch, options, token) {
        return this.doFormat(document, false);
    }
    doFormat(document, doLogError = true) {
        if (!this.shouldFormat(document))
            return;
        return new Promise((resolve, reject) => {
            this.analyzer.editFormat({
                file: utils_1.fsPath(document.uri),
                lineLength: config_1.config.for(document.uri).lineLength,
                selectionLength: 0,
                selectionOffset: 0,
            }).then((resp) => {
                if (resp.edits.length === 0)
                    resolve(null);
                else
                    resolve(resp.edits.map((e) => this.convertData(document, e)));
            }, (e) => {
                if (doLogError)
                    log_1.logError(e);
                reject();
            });
        });
    }
    shouldFormat(document) {
        if (!document || !document.uri || document.uri.scheme !== "file")
            return;
        const resourceConf = config_1.config.for(document.uri);
        const path = utils_1.fsPath(document.uri);
        return undefined === resourceConf.doNotFormat.find((p) => minimatch(path, p, { dot: true }));
    }
    convertData(document, edit) {
        return new vscode_1.TextEdit(new vscode_1.Range(document.positionAt(edit.offset), document.positionAt(edit.offset + edit.length)), edit.replacement);
    }
}
exports.DartFormattingEditProvider = DartFormattingEditProvider;
//# sourceMappingURL=dart_formatting_edit_provider.js.map