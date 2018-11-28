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
const vscode_1 = require("vscode");
const analyzer_1 = require("../analysis/analyzer");
const open_file_tracker_1 = require("../analysis/open_file_tracker");
const utils_1 = require("../utils");
const promises_1 = require("../utils/promises");
class DartDocumentSymbolProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideDocumentSymbols(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const outline = yield promises_1.waitFor(() => {
                if (token.isCancellationRequested) {
                    return;
                }
                return open_file_tracker_1.OpenFileTracker.getOutlineFor(document.uri);
            }, 500, 60000); // Wait up to 60 seconds for Outlines.
            if (!outline || !outline.children || !outline.children.length)
                return;
            return outline.children.map((r) => this.convertResult(document, r));
        });
    }
    convertResult(document, outline) {
        const symbol = new vscode_1.DocumentSymbol(outline.element.name, outline.element.parameters, analyzer_1.getSymbolKindForElementKind(outline.element.kind), this.getCodeOffset(document, outline), utils_1.toRange(document, outline.element.location.offset, outline.element.location.length));
        if (outline.children && outline.children.length) {
            symbol.children = outline.children.filter(this.shouldShow).map((r) => this.convertResult(document, r));
        }
        return symbol;
    }
    shouldShow(outline) {
        // Don't show these (#656).
        if (outline.element.kind === "CONSTRUCTOR_INVOCATION" || outline.element.kind === "FUNCTION_INVOCATION")
            return false;
        return true;
    }
    getCodeOffset(document, outline) {
        return utils_1.toRange(document, outline.codeOffset || outline.offset, outline.codeLength || outline.length);
    }
}
exports.DartDocumentSymbolProvider = DartDocumentSymbolProvider;
//# sourceMappingURL=dart_document_symbol_provider.js.map