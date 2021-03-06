"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const utils_1 = require("../utils");
class ClosingLabelsDecorations {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.subscriptions = [];
        this.decorationType = vs.window.createTextEditorDecorationType({
            after: {
                color: new vs.ThemeColor("dart.closingLabels"),
                margin: "2px",
            },
            rangeBehavior: vs.DecorationRangeBehavior.ClosedOpen,
        });
        this.subscriptions.push(this.analyzer.registerForAnalysisClosingLabels((n) => {
            if (this.activeEditor && n.file === utils_1.fsPath(this.activeEditor.document.uri)) {
                this.closingLabels = n;
                // Delay this so if we're getting lots of updates we don't flicker.
                if (this.updateTimeout)
                    clearTimeout(this.updateTimeout);
                this.updateTimeout = setTimeout(() => this.update(), 500);
            }
        }));
        this.subscriptions.push(vs.window.onDidChangeActiveTextEditor((e) => this.setTrackingFile(e)));
        if (vs.window.activeTextEditor)
            this.setTrackingFile(vs.window.activeTextEditor);
    }
    update() {
        if (!this.closingLabels || !this.activeEditor || this.closingLabels.file !== utils_1.fsPath(this.activeEditor.document.uri))
            return;
        const decorations = [];
        for (const r of this.closingLabels.labels) {
            const finalCharacterPosition = this.activeEditor.document.positionAt(r.offset + r.length);
            const finalCharacterRange = finalCharacterPosition.character > 0
                ? new vs.Range(finalCharacterPosition.translate({ characterDelta: -1 }), finalCharacterPosition)
                : new vs.Range(finalCharacterPosition, finalCharacterPosition.translate({ characterDelta: 1 }));
            const finalCharacterText = this.activeEditor.document.getText(finalCharacterRange);
            const endOfLine = this.activeEditor.document.lineAt(finalCharacterPosition).range.end;
            // We won't update if we had any bad notifications as this usually means either bad code resulted
            // in wonky results or the document was updated before the notification came back.
            if (finalCharacterText !== "]" && finalCharacterText !== ")")
                return;
            const existingDecorationForLine = decorations[endOfLine.line];
            if (existingDecorationForLine) {
                existingDecorationForLine.renderOptions.after.contentText = " // " + r.label + " " + existingDecorationForLine.renderOptions.after.contentText;
            }
            else {
                const dec = {
                    range: new vs.Range(this.activeEditor.document.positionAt(r.offset), endOfLine),
                    renderOptions: { after: { contentText: " // " + r.label } },
                };
                decorations[endOfLine.line] = dec;
            }
        }
        this.activeEditor.setDecorations(this.decorationType, Object.keys(decorations).map((k) => parseInt(k, 10)).map((k) => decorations[k]));
    }
    setTrackingFile(editor) {
        if (editor && utils_1.isAnalyzable(editor.document)) {
            this.activeEditor = editor;
            this.closingLabels = undefined;
            this.analyzer.forceNotificationsFor(utils_1.fsPath(editor.document.uri));
        }
        else
            this.activeEditor = undefined;
    }
    dispose() {
        this.activeEditor = undefined;
        this.subscriptions.forEach((s) => s.dispose());
    }
}
exports.ClosingLabelsDecorations = ClosingLabelsDecorations;
//# sourceMappingURL=closing_labels_decorations.js.map