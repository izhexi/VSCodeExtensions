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
const vscode_1 = require("vscode");
const open_file_tracker_1 = require("../analysis/open_file_tracker");
const project_1 = require("../project");
const utils_1 = require("../utils");
const outline_1 = require("../utils/outline");
const test_1 = require("../utils/test");
class TestCodeLensProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.disposables = [];
        this.onDidChangeCodeLensesEmitter = new vscode_1.EventEmitter();
        this.onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;
        this.disposables.push(this.analyzer.registerForAnalysisOutline((n) => {
            this.onDidChangeCodeLensesEmitter.fire();
        }));
        this.disposables.push(vscode_1.commands.registerCommand("_dart.startDebuggingTestFromOutline", (test) => {
            vscode_1.debug.startDebugging(vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(test.file)), test_1.getLaunchConfig(false, test.file, test.fullName, test.isGroup));
        }));
        this.disposables.push(vscode_1.commands.registerCommand("_dart.startWithoutDebuggingTestFromOutline", (test) => {
            vscode_1.debug.startDebugging(vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(test.file)), test_1.getLaunchConfig(true, test.file, test.fullName, test.isGroup));
        }));
    }
    provideCodeLenses(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            // This method has to be FAST because it affects layout of the document (adds extra lines) so
            // we don't already have an outline, we won't wait for one. A new outline arriving will trigger a
            // re-requesrt anyway.
            const outline = open_file_tracker_1.OpenFileTracker.getOutlineFor(document.uri);
            if (!outline || !outline.children || !outline.children.length)
                return;
            // We should only show the Code Lens for projects we know can actually handle `pub run` (for ex. the
            // SDK codebase cannot, and will therefore run all tests when you click them).
            const projectRoot = project_1.locateBestProjectRoot(utils_1.fsPath(document.uri));
            if (!projectRoot || !utils_1.projectSupportsPubRunTest(projectRoot))
                return;
            const visitor = new outline_1.TestOutlineVisitor();
            visitor.visit(outline);
            return _.flatMap(visitor.tests
                .filter((test) => test.offset && test.length)
                .map((test) => {
                return [
                    new vscode_1.CodeLens(utils_1.toRange(document, test.offset, test.length), {
                        arguments: [test],
                        command: "_dart.startWithoutDebuggingTestFromOutline",
                        title: "Run",
                    }),
                    new vscode_1.CodeLens(utils_1.toRange(document, test.offset, test.length), {
                        arguments: [test],
                        command: "_dart.startDebuggingTestFromOutline",
                        title: "Debug",
                    }),
                ];
            }));
        });
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.TestCodeLensProvider = TestCodeLensProvider;
//# sourceMappingURL=test_code_lens_provider.js.map