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
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const util_1 = require("util");
const fs = require("fs");
require("./templates/stateful_widget/templateWidget");
require("./templates/stateful_widget/templateWidgetView");
require("./templates/stateful_widget/templateWidgetViewModel");
const templateWidget_1 = require("./templates/stateful_widget/templateWidget");
const templateWidgetView_1 = require("./templates/stateful_widget/templateWidgetView");
const templateWidgetViewModel_1 = require("./templates/stateful_widget/templateWidgetViewModel");
const mkdir = util_1.promisify(fs.mkdir);
const writeFile = util_1.promisify(fs.writeFile);
function activate(context) {
    let generateStatefulWidgetCmd = vscode.commands.registerCommand('extension.generateStatefulWidget', () => {
        generateStatefulWidget();
    });
    // context.subscriptions.push(disposable);
    context.subscriptions.push(generateStatefulWidgetCmd);
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
// Options for folder selection dialog
const dialogOptions = {
    canSelectFiles: false,
    canSelectMany: false,
    canSelectFolders: true
};
// Options for input dialog
const inputBoxOptions = {
    placeHolder: 'MyAwesomeWidget',
    prompt: 'Input your widget name in camel case.'
};
// Function for opening and getting the path to save the files
function openFolderSelectionDialog() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            vscode.window.showOpenDialog(dialogOptions).then(folderUri => {
                if (folderUri && folderUri[0]) {
                    resolve(folderUri[0].path);
                }
                else {
                    resolve(undefined);
                }
            });
        });
    });
}
function generateStatefulWidget() {
    return __awaiter(this, void 0, void 0, function* () {
        const widgetName = yield vscode.window.showInputBox(inputBoxOptions);
        if (widgetName === undefined) {
            vscode.window.showErrorMessage('Invalid widget name');
            return;
        }
        const path = yield openFolderSelectionDialog();
        if (path === undefined) {
            vscode.window.showErrorMessage('Invalid path');
        }
        const folderAndFileName = widgetName.split(/(?=[A-Z])/).join('_').toLowerCase();
        const folderPath = path + '/' + folderAndFileName;
        try {
            // TODO: Deal with the situation when folder exist
            yield mkdir(folderPath);
        }
        catch (error) {
            vscode.window.showErrorMessage('Something went wrong');
            return;
        }
        // Write WidgetFile
        const widgetData = templateWidget_1.default(widgetName, folderAndFileName);
        const widgetViewData = templateWidgetView_1.default(widgetName, folderAndFileName);
        const widgetViewModelData = templateWidgetViewModel_1.default(widgetName, folderAndFileName);
        try {
            yield writeFile(folderPath + '/' + folderAndFileName + '.dart', widgetData, 'utf8');
            yield writeFile(folderPath + '/' + folderAndFileName + '_view' + '.dart', widgetViewData, 'utf8');
            yield writeFile(folderPath + '/' + folderAndFileName + '_view_model' + '.dart', widgetViewModelData, 'utf8');
        }
        catch (error) {
            vscode.window.showErrorMessage('Something went wrong');
            return;
        }
    });
}
//# sourceMappingURL=extension.js.map