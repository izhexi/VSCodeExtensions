"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const Constants = __importStar(require("../common/constants"));
const decorator_1 = require("../utils/decorator");
const mimeUtility_1 = require("../utils/mimeUtility");
const persistUtility_1 = require("../utils/persistUtility");
const httpResponseWebview_1 = require("../views/httpResponseWebview");
const clipboardy = require('clipboardy');
class ResponseController {
    constructor() {
        fs.ensureDir(ResponseController.responseSaveFolderPath);
        fs.ensureDir(ResponseController.responseBodySaveFolderPath);
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = httpResponseWebview_1.HttpResponseWebview.activePreviewResponse;
            if (response) {
                const fullResponse = this.getFullResponseString(response);
                const defaultFilePath = path.join(ResponseController.responseSaveFolderPath, `Response-${Date.now()}.http`);
                try {
                    const uri = yield vscode_1.window.showSaveDialog({ defaultUri: vscode_1.Uri.file(defaultFilePath) });
                    if (uri) {
                        let filePath = uri.fsPath;
                        yield persistUtility_1.PersistUtility.ensureFileAsync(filePath);
                        yield fs.writeFile(filePath, fullResponse);
                        yield vscode_1.window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' }).then(function (btn) {
                            if (btn) {
                                if (btn.title === 'Open') {
                                    vscode_1.workspace.openTextDocument(filePath).then(vscode_1.window.showTextDocument);
                                }
                                else if (btn.title === 'Copy Path') {
                                    clipboardy.writeSync(filePath);
                                }
                            }
                        });
                    }
                }
                catch (_a) {
                    vscode_1.window.showErrorMessage('Failed to save latest response to disk.');
                }
            }
        });
    }
    saveBody() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = httpResponseWebview_1.HttpResponseWebview.activePreviewResponse;
            if (response) {
                const contentType = response.getHeader("content-type");
                const extension = mimeUtility_1.MimeUtility.getExtension(contentType, '');
                const fileName = !extension ? `Response-${Date.now()}` : `Response-${Date.now()}.${extension}`;
                const defaultFilePath = path.join(ResponseController.responseBodySaveFolderPath, fileName);
                try {
                    const uri = yield vscode_1.window.showSaveDialog({ defaultUri: vscode_1.Uri.file(defaultFilePath) });
                    if (uri) {
                        const filePath = uri.fsPath;
                        yield persistUtility_1.PersistUtility.ensureFileAsync(filePath);
                        yield fs.writeFile(filePath, response.bodyBuffer);
                        yield vscode_1.window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' }).then(function (btn) {
                            if (btn) {
                                if (btn.title === 'Open') {
                                    vscode_1.workspace.openTextDocument(filePath).then(vscode_1.window.showTextDocument);
                                }
                                else if (btn.title === 'Copy Path') {
                                    clipboardy.writeSync(filePath);
                                }
                            }
                        });
                    }
                }
                catch (_a) {
                    vscode_1.window.showErrorMessage('Failed to save latest response body to disk');
                }
            }
        });
    }
    dispose() {
    }
    getFullResponseString(response) {
        let statusLine = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${os.EOL}`;
        let headerString = '';
        for (let header in response.headers) {
            if (response.headers.hasOwnProperty(header)) {
                headerString += `${header}: ${response.headers[header]}${os.EOL}`;
            }
        }
        let body = '';
        if (response.body) {
            body = `${os.EOL}${response.body}`;
        }
        return `${statusLine}${headerString}${body}`;
    }
}
ResponseController.responseSaveFolderPath = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseDownloadFolderName);
ResponseController.responseBodySaveFolderPath = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseBodyDownloadFolderName);
__decorate([
    decorator_1.trace('Response-Save')
], ResponseController.prototype, "save", null);
__decorate([
    decorator_1.trace('Response-Save-Body')
], ResponseController.prototype, "saveBody", null);
exports.ResponseController = ResponseController;
//# sourceMappingURL=responseController.js.map