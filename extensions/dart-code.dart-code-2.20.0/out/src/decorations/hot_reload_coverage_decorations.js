"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const path = require("path");
const vs = require("vscode");
const extension_1 = require("../extension");
const utils_1 = require("../utils");
const log_1 = require("../utils/log");
class HotReloadCoverageDecorations {
    constructor(debug) {
        this.subscriptions = [];
        this.fileState = {};
        this.isDebugging = false;
        this.modifiedDecorationType = vs.window.createTextEditorDecorationType({
            gutterIconPath: vs.Uri.file(path.join(extension_1.extensionPath, `media/icons/reload_coverage/modified.svg`)),
            isWholeLine: true,
            rangeBehavior: vs.DecorationRangeBehavior.OpenOpen,
        });
        this.notRunDecorationType = vs.window.createTextEditorDecorationType({
            gutterIconPath: vs.Uri.file(path.join(extension_1.extensionPath, `media/icons/reload_coverage/not_run.svg`)),
            isWholeLine: true,
            rangeBehavior: vs.DecorationRangeBehavior.OpenOpen,
        });
        this.subscriptions.push(vs.workspace.onDidChangeTextDocument((e) => this.onDidChangeTextDocument(e)));
        this.subscriptions.push(debug.onFirstFrame(() => this.onFirstFrame()));
        this.subscriptions.push(vs.window.onDidChangeVisibleTextEditors((e) => this.onDidChangeVisibleTextEditors(e)));
        this.subscriptions.push(debug.onWillHotReload(() => this.onWillHotReload()));
        this.subscriptions.push(debug.onWillHotRestart(() => this.onWillFullRestart()));
        this.subscriptions.push(vs.debug.onDidStartDebugSession((e) => this.onDidStartDebugSession()));
        this.subscriptions.push(vs.debug.onDidTerminateDebugSession((e) => this.onDidTerminateDebugSession()));
        this.subscriptions.push(debug.onReceiveCoverage((c) => this.onReceiveCoverage(c)));
        // TODO: On execution, remove from notRun list
        // TODO: If file modified externally, we may need to drop all markers?
    }
    onFirstFrame() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.coverageFilesUpdate();
        });
    }
    onDidChangeVisibleTextEditors(editors) {
        return __awaiter(this, void 0, void 0, function* () {
            this.redrawDecorations(editors);
            yield this.coverageFilesUpdate();
            yield this.requestCoverageUpdate();
        });
    }
    onDidChangeTextDocument(e) {
        if (!this.isDebugging)
            return;
        const editor = vs.window.visibleTextEditors.find((editor) => editor.document.uri === e.document.uri);
        if (!editor)
            return;
        let fileState = this.fileState[utils_1.fsPath(e.document.uri)];
        if (!fileState) {
            fileState = this.fileState[utils_1.fsPath(e.document.uri)] = { modified: [], notRun: [] };
        }
        // Move all "not run" edits back into "edited" because we can't track them anymore as the coverage
        // data will be bad.
        fileState.modified = fileState.modified.concat(fileState.notRun);
        fileState.notRun = [];
        // Update all existing ranges offsets.
        for (const change of e.contentChanges) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const linesInRange = endLine - startLine;
            const linesInserted = change.text.split("\n").length - 1;
            const diff = linesInserted - linesInRange;
            if (diff === 0)
                continue;
            fileState.modified = this.translateChanges(fileState.modified, startLine, endLine, diff);
        }
        // Append the new ranges.
        for (const change of e.contentChanges) {
            const originalText = editor.document.getText(change.range);
            const newText = change.text;
            // Don't mark if the replacement text is the same as the old text.
            if (newText === originalText)
                continue;
            // Don't mark if we're just deleting whitespace (eg. backspace on a newline).
            if (originalText.trim() === "" && !newText)
                continue;
            // If we're just adding whitespace, don't mark that.
            if (!originalText && newText.trim() === "")
                continue;
            const linesInserted = change.text.split("\n").length - 1;
            // TODO: Make it an array of bools?
            for (let l = change.range.start.line; l <= change.range.start.line + linesInserted; l++)
                fileState.modified.push(l);
        }
        // Make the lists unique
        fileState.modified = _.uniq(fileState.modified);
        // Remove any uninteresting lines
        fileState.modified = fileState.modified.filter((lineNumber) => {
            try {
                const lineText = editor.document.lineAt(lineNumber).text.trim();
                if (lineText === "" || lineText === "{" || lineText === "}" || lineText === "/" || lineText.startsWith("//") || lineText.startsWith("@"))
                    return false;
                return true;
            }
            catch (e) {
                log_1.logError(e);
                return false;
            }
        });
        this.redrawDecorations([editor]);
    }
    translateChanges(lines, startLine, endLine, diff) {
        return lines
            .map((l) => {
            if (startLine >= l) {
                // If the new change is after the old one, we don't need to map.
                return l;
            }
            else if (startLine <= l && endLine >= l) {
                // If this new change contains the whole of the old change, we don't need the old change.
                return undefined;
            }
            else {
                // Otherwise, just need to offset it.
                return l + diff;
            }
        })
            .filter((l) => l);
    }
    onWillHotReload() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const file of Object.keys(this.fileState)) {
                for (const line of Object.keys(this.fileState[file]).map((k) => parseInt(k, 10))) {
                    const fileState = this.fileState[file];
                    fileState.modified.forEach((r) => fileState.notRun.push(r));
                    fileState.modified.length = 0;
                }
            }
            // After the above code we may have new files to track, so re-send them here.
            yield this.coverageFilesUpdate();
            this.redrawDecorations(vs.window.visibleTextEditors);
        });
    }
    onWillFullRestart() {
        this.clearAllMarkers();
    }
    onDidStartDebugSession() {
        this.isDebugging = true;
    }
    onDidTerminateDebugSession() {
        this.isDebugging = false;
        this.clearAllMarkers();
    }
    clearAllMarkers() {
        for (const file of Object.keys(this.fileState)) {
            delete this.fileState[file];
        }
        this.redrawDecorations(vs.window.visibleTextEditors);
    }
    redrawDecorations(editors) {
        if (!editors)
            return;
        for (const editor of editors) {
            const fileState = this.fileState[utils_1.fsPath(editor.document.uri)];
            editor.setDecorations(this.modifiedDecorationType, fileState ? this.toRanges(editor, fileState.modified) : []);
            editor.setDecorations(this.notRunDecorationType, fileState ? this.toRanges(editor, fileState.notRun) : []);
        }
    }
    toRanges(editor, lines) {
        return lines.map((l) => editor.document.lineAt(l).range);
    }
    coverageFilesUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isDebugging)
                return;
            const openFilesWithChanges = vs.window
                .visibleTextEditors
                .map((e) => utils_1.fsPath(e.document.uri))
                .filter((file) => this.fileState[file] && this.fileState[file].notRun.length !== 0);
            yield vs.commands.executeCommand("_dart.coverageFilesUpdate", openFilesWithChanges);
        });
    }
    requestCoverageUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isDebugging)
                return;
            // If we don't have any "not run" changes, there's no point asking for coverage.
            const hasAnyChanges = !!Object.keys(this.fileState)
                .find((file) => this.fileState[file].notRun.length !== 0);
            if (hasAnyChanges)
                yield vs.commands.executeCommand("_dart.requestCoverageUpdate");
        });
    }
    onReceiveCoverage(coverageData) {
        for (const data of coverageData) {
            const fileState = this.fileState[utils_1.fsPath(data.scriptPath)];
            if (!fileState)
                continue;
            const editor = vs.window.visibleTextEditors.find((editor) => utils_1.fsPath(editor.document.uri) === data.scriptPath);
            for (const line of data.hitLines) {
                fileState.notRun = fileState.notRun.filter((l) => l !== line - 1);
            }
            this.redrawDecorations([editor]);
        }
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
}
exports.HotReloadCoverageDecorations = HotReloadCoverageDecorations;
//# sourceMappingURL=hot_reload_coverage_decorations.js.map