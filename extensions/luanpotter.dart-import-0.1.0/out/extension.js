'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fetchPackageName = (context) => __awaiter(this, void 0, void 0, function* () {
    const files = yield vscode.workspace.findFiles('pubspec.yaml');
    if (files.length != 1) {
        vscode.window.showErrorMessage(`Expected to find a single pubspec.yaml file, ${files.length} found.`);
        return null;
    }
    const file = yield vscode.workspace.openTextDocument(files[0]);
    const fileName = file.fileName.replace(/\/pubspec\.yaml$/, '');
    const possibleNameLines = file.getText().split('\n').filter(line => line.match(/^\s*name:/));
    if (possibleNameLines.length != 1) {
        vscode.window.showErrorMessage(`Expected to find a single line starting with 'name:' on pubspec.yaml file, ${possibleNameLines.length} found.`);
        return null;
    }
    const nameLine = possibleNameLines[0];
    const regex = /^\s*name:\s*(.*)$/.exec(nameLine);
    if (!regex) {
        vscode.window.showErrorMessage(`Expected line 'name:' on pubspec.yaml to match regex, but it didn't (line: ${nameLine}).`);
        return null;
    }
    return {
        projectRoot: fileName,
        projectName: regex[1],
    };
});
exports.relativize = (filePath, importPath) => {
    const pathSplit = (path) => path.length === 0 ? [] : path.split('/');
    const fileBits = pathSplit(filePath);
    const importBits = pathSplit(importPath);
    let dotdotAmount = 0, startIdx;
    for (startIdx = 0; startIdx < fileBits.length; startIdx++) {
        if (fileBits[startIdx] === importBits[startIdx]) {
            continue;
        }
        dotdotAmount = fileBits.length - startIdx;
        break;
    }
    const relativeBits = new Array(dotdotAmount).fill('..').concat(importBits.slice(startIdx));
    return relativeBits.join('/');
};
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageInfo = yield fetchPackageName(context);
        const cmd = vscode.commands.registerCommand('dart-import.fix', () => __awaiter(this, void 0, void 0, function* () {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return; // No open text editor
            }
            if (!packageInfo) {
                vscode.window.showErrorMessage('Failed to initialize extension. Is this a valid Dart/Flutter project?');
                return;
            }
            const currentPath = editor.document.fileName.replace(/\/[^\/]*.dart$/, '');
            const libFolder = packageInfo.projectRoot + '/lib';
            if (!currentPath.startsWith(libFolder)) {
                vscode.window.showErrorMessage('Current file is not on project root or not on lib folder? File must be on $root/lib.');
                return;
            }
            const relativePath = currentPath.substring(libFolder.length + 1);
            let count = 0;
            for (let currentLine = 0;; currentLine++) {
                const line = editor.document.lineAt(currentLine);
                if (line.text.trim().length === 0) {
                    continue;
                }
                const content = line.text.trim();
                if (!content.startsWith('import ')) {
                    break;
                }
                const regex = new RegExp(`^\\s*import\\s*(['"])package:${packageInfo.projectName}/([^'"]*)['"]\\s*;\\s*$`);
                const exec = regex.exec(content);
                if (exec) {
                    const quote = exec[1];
                    const importPath = exec[2];
                    const relativeImport = exports.relativize(relativePath, importPath);
                    const content = `import ${quote}${relativeImport}${quote};`;
                    yield editor.edit((builder) => {
                        const start = new vscode.Position(currentLine, 0);
                        const end = new vscode.Position(currentLine, line.text.length);
                        builder.replace(new vscode.Range(start, end), content);
                    });
                    count++;
                }
            }
            vscode.commands.executeCommand('editor.action.organizeImports');
            vscode.window.showInformationMessage((count === 0 ? 'No lines changed.' : `${count} imports fixed.`) + ' All imports sorted.');
        }));
        context.subscriptions.push(cmd);
    });
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map