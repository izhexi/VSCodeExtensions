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
const vs = require("vscode");
const utils_1 = require("../utils");
const outline_1 = require("../utils/outline");
class DartImplementationProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideImplementation(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            // Try to use the Outline data to snap our location to a node.
            // For example in:
            //
            //     void b();
            //
            // The search.getTypeHierarchy call will only work over "b" but by using outline we
            // can support the whole "void b();".
            const outlineNode = outline_1.findNearestOutlineNode(document, position, true);
            const offset = outlineNode ? outlineNode.element.location.offset : document.offsetAt(position);
            const hierarchy = yield this.analyzer.searchGetTypeHierarchy({
                file: utils_1.fsPath(document.uri),
                offset,
            });
            if (!hierarchy || !hierarchy.hierarchyItems || !hierarchy.hierarchyItems.length || hierarchy.hierarchyItems.length === 1)
                return;
            // Find the element we started with, since we only want implementations (not super classes).
            const currentItem = hierarchy.hierarchyItems.find((h) => {
                const elm = h.memberElement || h.classElement;
                return elm.location.offset <= offset && elm.location.offset + elm.location.length >= offset;
            })
                // If we didn't find the element when we might have been at a call site, so we'll have to start
                // at the root.
                || hierarchy.hierarchyItems[0];
            const isClass = !currentItem.memberElement;
            function getDescendants(item) {
                return _.concat(item.subclasses.map((i) => hierarchy.hierarchyItems[i]), _.flatMap(item.subclasses, (i) => getDescendants(hierarchy.hierarchyItems[i])));
            }
            const descendants = getDescendants(currentItem)
                .map((d) => isClass ? d.classElement : d.memberElement)
                .filter((d) => d);
            const locations = [];
            for (const element of descendants) {
                const range = utils_1.toRange(yield vs.workspace.openTextDocument(element.location.file), element.location.offset, element.location.length);
                locations.push(new vs.Location(vs.Uri.file(element.location.file), range));
            }
            return locations;
        });
    }
}
exports.DartImplementationProvider = DartImplementationProvider;
//# sourceMappingURL=dart_implementation_provider.js.map