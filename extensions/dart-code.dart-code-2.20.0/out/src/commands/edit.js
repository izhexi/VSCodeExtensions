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
const fs = require("fs");
const vs = require("vscode");
const editors = require("../editors");
const utils_1 = require("../utils");
const log_1 = require("../utils/log");
class EditCommands {
    constructor(context, analyzer) {
        this.context = context;
        this.analyzer = analyzer;
        this.commands = [];
        this.commands.push(vs.commands.registerCommand("_dart.organizeImports", this.organizeImports, this), vs.commands.registerCommand("dart.sortMembers", this.sortMembers, this), vs.commands.registerCommand("_dart.applySourceChange", this.applyEdits, this), vs.commands.registerCommand("_dart.jumpToLineColInUri", this.jumpToLineColInUri, this), vs.commands.registerCommand("_dart.showCode", this.showCode, this), vs.commands.registerCommand("dart.completeStatement", this.completeStatement, this));
    }
    getActiveDoc() {
        return vs.window.activeTextEditor && vs.window.activeTextEditor.document;
    }
    organizeImports(document) {
        document = document || this.getActiveDoc();
        return this.sendEdit(this.analyzer.editOrganizeDirectives, "Organize Imports", document || vs.window.activeTextEditor.document);
    }
    jumpToLineColInUri(uri, lineNumber, columnNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!uri || uri.scheme !== "file")
                return;
            const doc = yield vs.workspace.openTextDocument(uri);
            const editor = yield vs.window.showTextDocument(doc);
            if (lineNumber && columnNumber) {
                const line = doc.lineAt(lineNumber > 0 ? lineNumber - 1 : 0);
                const firstChar = line.range.start.translate({ characterDelta: line.firstNonWhitespaceCharacterIndex });
                this.showCode(editor, line.range, line.range, new vs.Range(firstChar, firstChar));
            }
        });
    }
    showCode(editor, displayRange, highlightRange, selectionRange) {
        if (selectionRange)
            editor.selection = new vs.Selection(selectionRange.start, selectionRange.end);
        // Ensure the code is visible on screen.
        editor.revealRange(displayRange, vs.TextEditorRevealType.InCenterIfOutsideViewport);
        // Re-reveal the first line, to ensure it was always visible (eg. in case the main range was bigger than the screen).
        // Using .Default means it'll do as little scrolling as possible.
        editor.revealRange(new vs.Range(displayRange.start, displayRange.start), vs.TextEditorRevealType.Default);
        // TODO: Implement highlighting
        // See https://github.com/Microsoft/vscode/issues/45059
    }
    sortMembers(document) {
        document = document || this.getActiveDoc();
        return this.sendEdit(this.analyzer.editSortMembers, "Sort Members", document);
    }
    completeStatement() {
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vs.window.activeTextEditor;
            if (!editor || !editor.selection || !this.analyzer.capabilities.hasCompleteStatementFix)
                return;
            const document = editor.document;
            const file = utils_1.fsPath(document.uri);
            const offset = document.offsetAt(editor.selection.end);
            const res = yield this.analyzer.editGetStatementCompletion({ file, offset });
            if (res && res.change)
                yield this.applyEdits(document, res.change);
        });
    }
    sendEdit(f, commandName, document) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editors.isDartDocument(document)) {
                vs.window.showWarningMessage("Not a Dart file.");
                return;
            }
            const originalDocumentVersion = document.version;
            f = f.bind(this.analyzer); // Yay JavaScript!
            try {
                const response = yield f({ file: utils_1.fsPath(document.uri) });
                const edit = response.edit;
                if (edit.edits.length === 0)
                    return;
                if (document.isClosed) {
                    vs.window.showErrorMessage(`Error running ${commandName}: Document has been closed.`);
                    return;
                }
                if (document.version !== originalDocumentVersion) {
                    vs.window.showErrorMessage(`Error running ${commandName}: Document has been modified.`);
                    return;
                }
                const editBuilder = new vs.WorkspaceEdit();
                edit.edits.forEach((edit) => {
                    const range = new vs.Range(document.positionAt(edit.offset), document.positionAt(edit.offset + edit.length));
                    editBuilder.replace(document.uri, range, edit.replacement);
                });
                yield vs.workspace.applyEdit(editBuilder);
            }
            catch (error) {
                vs.window.showErrorMessage(`Error running ${commandName}: ${error.message}.`);
            }
        });
    }
    dispose() {
        for (const command of this.commands)
            command.dispose();
    }
    applyEdits(initiatingDocument, change) {
        return __awaiter(this, void 0, void 0, function* () {
            // We can only apply with snippets if there's a single change.
            if (change.edits.length === 1 && change.linkedEditGroups != null && change.linkedEditGroups.length !== 0)
                return this.applyEditsWithSnippets(initiatingDocument, change);
            // VS Code expects offsets to be based on the original document, but the analysis server provides
            // them assuming all previous edits have already been made. This means if the server provides us a
            // set of edits where any edits offset is *equal to or greater than* a previous edit, it will do the wrong thing.
            // If this happens; we will fall back to sequential edits and write a warning.
            const hasProblematicEdits = hasOverlappingEdits(change);
            if (hasProblematicEdits) {
                log_1.logWarn("Falling back to sequential edits due to overlapping edits in server.");
            }
            const applyEditsSequentially = hasProblematicEdits;
            // Otherwise, just make all the edits without the snippets.
            let changes = applyEditsSequentially ? undefined : new vs.WorkspaceEdit();
            for (const edit of change.edits) {
                const uri = vs.Uri.file(edit.file);
                // We can only create files with edits that are at 0/0 because we can't open the document if it doesn't exist.
                // If we create the file ourselves, it won't go into the single undo buffer.
                if (!fs.existsSync(edit.file) && edit.edits.find((e) => e.offset !== 0 || e.length !== 0)) {
                    log_1.logError(`Unable to edit file ${edit.file} because it does not exist and had an edit that was not the start of the file`);
                    vs.window.showErrorMessage(`Unable to edit file ${edit.file} because it does not exist and had an edit that was not the start of the file`);
                    continue;
                }
                const document = fs.existsSync(edit.file) ? yield vs.workspace.openTextDocument(uri) : undefined;
                if (changes)
                    changes.createFile(uri, { ignoreIfExists: true });
                for (const e of edit.edits) {
                    if (!changes) {
                        changes = new vs.WorkspaceEdit();
                        changes.createFile(uri, { ignoreIfExists: true });
                    }
                    const range = document
                        ? new vs.Range(document.positionAt(e.offset), document.positionAt(e.offset + e.length))
                        : new vs.Range(new vs.Position(0, 0), new vs.Position(0, 0));
                    changes.replace(uri, range, e.replacement);
                    if (applyEditsSequentially) {
                        yield vs.workspace.applyEdit(changes);
                        changes = undefined;
                    }
                }
            }
            // If we weren't applying sequentially
            if (changes)
                yield vs.workspace.applyEdit(changes);
            // Set the cursor position.
            if (change.selection) {
                const uri = vs.Uri.file(change.selection.file);
                const document = yield vs.workspace.openTextDocument(uri);
                const editor = yield vs.window.showTextDocument(document);
                const pos = document.positionAt(change.selection.offset);
                const selection = new vs.Selection(pos, pos);
                editor.selection = selection;
            }
        });
    }
    applyEditsWithSnippets(initiatingDocument, change) {
        return __awaiter(this, void 0, void 0, function* () {
            const edit = change.edits[0];
            const document = yield vs.workspace.openTextDocument(edit.file);
            const editor = yield vs.window.showTextDocument(document);
            // Apply of all of the edits.
            yield editor.edit((eb) => {
                edit.edits.forEach((e) => {
                    eb.replace(new vs.Range(document.positionAt(e.offset), document.positionAt(e.offset + e.length)), e.replacement);
                });
            });
            const documentText = editor.document.getText();
            // Create a list of all the placeholders.
            const placeholders = [];
            let placeholderNumber = 1;
            change.linkedEditGroups.forEach((leg) => {
                leg.positions.forEach((pos) => {
                    const defaultValue = documentText.substr(pos.offset, leg.length);
                    const choices = leg.suggestions ? leg.suggestions.map((s) => s.value) : undefined;
                    placeholders.push({ offset: pos.offset, length: leg.length, defaultValue, choices, placeholderNumber });
                });
                placeholderNumber++;
            });
            // Ensure they're in offset order so the next maths works!
            placeholders.sort((p1, p2) => p1.offset - p2.offset);
            const snippet = new vs.SnippetString();
            const firstPlaceholder = placeholders[0];
            const lastPlaceholder = placeholders[placeholders.length - 1];
            const startPos = firstPlaceholder.offset;
            const endPos = lastPlaceholder.offset + lastPlaceholder.length;
            let currentPos = startPos;
            placeholders.forEach((p) => {
                // Add the text from where we last were up to current placeholder.
                if (currentPos !== p.offset)
                    snippet.appendText(documentText.substring(currentPos, p.offset));
                // Add the choices / placeholder.
                // Uncomment for https://github.com/Dart-Code/Dart-Code/issues/569 when there's an API we can use
                if (p.choices && p.choices.length > 1)
                    snippet.appendText("").value += "${" + p.placeholderNumber + "|" + p.choices.map((c) => this.snippetStringEscape(c)).join(",") + "|}";
                else
                    snippet.appendPlaceholder(p.defaultValue, p.placeholderNumber);
                currentPos = p.offset + p.length;
            });
            // Replace the document.
            yield editor.insertSnippet(snippet, new vs.Range(document.positionAt(startPos), document.positionAt(endPos)));
            // Ensure original document is the active one.
            yield vs.window.showTextDocument(initiatingDocument);
        });
    }
    snippetStringEscape(value) {
        return value.replace(/\$|}|\\|,/g, "\\$&");
    }
}
exports.EditCommands = EditCommands;
function hasOverlappingEdits(change) {
    const priorEdits = {};
    for (const edit of change.edits) {
        if (!priorEdits[edit.file])
            priorEdits[edit.file] = [];
        for (const e of edit.edits) {
            if (priorEdits[edit.file].find((pe) => pe.offset <= e.offset))
                return true;
            priorEdits[edit.file].push(e);
        }
    }
    return false;
}
exports.hasOverlappingEdits = hasOverlappingEdits;
//# sourceMappingURL=edit.js.map