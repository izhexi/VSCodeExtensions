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
const vs = require("vscode");
const editors = require("../editors");
const utils_1 = require("../utils");
const outline_1 = require("../utils/outline");
class GoToSuperCommand {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.disposables = [];
        this.disposables.push(vs.commands.registerCommand("dart.goToSuper", this.goToSuper, this));
    }
    goToSuper() {
        return __awaiter(this, void 0, void 0, function* () {
            const editor = editors.getActiveDartEditor();
            if (!editor) {
                vs.window.showWarningMessage("No active Dart editor.");
                return;
            }
            const document = editor.document;
            const position = editor.selection.start;
            const outlineNode = outline_1.findNearestOutlineNode(document, position);
            const offset = outlineNode && outlineNode.element && outlineNode.element.location
                ? outlineNode.element.location.offset
                : document.offsetAt(position);
            const hierarchy = yield this.analyzer.searchGetTypeHierarchy({
                file: utils_1.fsPath(document.uri),
                offset,
                superOnly: true,
            });
            if (!hierarchy || !hierarchy.hierarchyItems || !hierarchy.hierarchyItems.length || hierarchy.hierarchyItems.length === 1)
                return;
            // The first item is the current node, so skip that one and walk up till we find a matching member.
            const isClass = !hierarchy.hierarchyItems[0].memberElement;
            const item = hierarchy.hierarchyItems.slice(1).find((h) => isClass ? !!h.classElement : !!h.memberElement);
            const element = isClass ? item && item.classElement : item && item.memberElement;
            if (!element || !element.location)
                return;
            // TODO: extract out so we have one way of jumping to code
            // Currently we have Type Hierarchy, Go To Super, Flutter Outline
            const elementDocument = yield vs.workspace.openTextDocument(element.location.file);
            const elementEditor = yield vs.window.showTextDocument(elementDocument);
            const range = utils_1.toRangeOnLine(element.location);
            elementEditor.revealRange(range, vs.TextEditorRevealType.InCenterIfOutsideViewport);
            elementEditor.selection = new vs.Selection(range.end, range.start);
        });
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.GoToSuperCommand = GoToSuperCommand;
//# sourceMappingURL=go_to_super.js.map