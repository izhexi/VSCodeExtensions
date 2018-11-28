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
const os_1 = require("os");
const vscode_1 = require("vscode");
const arrayUtility_1 = require("../common/arrayUtility");
const Constants = __importStar(require("../common/constants"));
const harHttpRequest_1 = require("../models/harHttpRequest");
const requestParserFactory_1 = require("../models/requestParserFactory");
const decorator_1 = require("../utils/decorator");
const selector_1 = require("../utils/selector");
const telemetry_1 = require("../utils/telemetry");
const variableProcessor_1 = require("../utils/variableProcessor");
const workspaceUtility_1 = require("../utils/workspaceUtility");
const codeSnippetWebview_1 = require("../views/codeSnippetWebview");
const clipboardy = require('clipboardy');
const encodeUrl = require('encodeurl');
const HTTPSnippet = require('httpsnippet');
class CodeSnippetController {
    constructor() {
        this._webview = new codeSnippetWebview_1.CodeSnippetWebview();
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vscode_1.window.activeTextEditor;
            const document = workspaceUtility_1.getCurrentTextDocument();
            if (!editor || !document) {
                return;
            }
            // Get selected text of selected lines or full document
            let selectedText = new selector_1.Selector().getSelectedText(editor);
            if (!selectedText) {
                return;
            }
            // remove comment lines
            let lines = selectedText.split(Constants.LineSplitterRegex).filter(l => !Constants.CommentIdentifiersRegex.test(l));
            if (lines.length === 0 || lines.every(line => line === '')) {
                return;
            }
            // remove file variables definition lines and leading empty lines
            selectedText = arrayUtility_1.ArrayUtility.skipWhile(lines, l => Constants.FileVariableDefinitionRegex.test(l) || l.trim() === '').join(os_1.EOL);
            // variables replacement
            selectedText = yield variableProcessor_1.VariableProcessor.processRawRequest(selectedText);
            // parse http request
            let httpRequest = new requestParserFactory_1.RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, document.fileName);
            if (!httpRequest) {
                return;
            }
            let harHttpRequest = this.convertToHARHttpRequest(httpRequest);
            let snippet = new HTTPSnippet(harHttpRequest);
            if (CodeSnippetController._availableTargets) {
                const quickPick = vscode_1.window.createQuickPick();
                const targetQuickPickItems = CodeSnippetController._availableTargets.map(target => ({ label: target.title, target }));
                quickPick.title = 'Generate Code Snippet';
                quickPick.step = 1;
                quickPick.totalSteps = 2;
                quickPick.items = targetQuickPickItems;
                quickPick.matchOnDescription = true;
                quickPick.matchOnDetail = true;
                quickPick.onDidHide(() => quickPick.dispose());
                quickPick.onDidTriggerButton(() => {
                    quickPick.step--;
                    quickPick.buttons = [];
                    quickPick.items = targetQuickPickItems;
                });
                quickPick.onDidChangeSelection(selection => {
                    if (selection[0]) {
                        if (quickPick.step === 1) {
                            quickPick.step++;
                            quickPick.buttons = [vscode_1.QuickInputButtons.Back];
                            const targetItem = selection[0];
                            quickPick.items = targetItem.target.clients.map(client => ({
                                label: client.title,
                                description: client.description,
                                detail: client.link,
                                target: targetItem.target,
                                client
                            }));
                        }
                        else if (quickPick.step === 2) {
                            const { target: { key: tk, title: tt }, client: { key: ck, title: ct } } = selection[0];
                            telemetry_1.Telemetry.sendEvent('Generate Code Snippet', { 'target': tk, 'client': ck });
                            let result = snippet.convert(tk, ck);
                            this._convertedResult = result;
                            try {
                                this._webview.render(result, `${tt}-${ct}`, tk);
                            }
                            catch (reason) {
                                vscode_1.window.showErrorMessage(reason);
                            }
                        }
                    }
                });
                quickPick.show();
            }
            else {
                vscode_1.window.showInformationMessage('No available code snippet convert targets');
            }
        });
    }
    copy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._convertedResult) {
                clipboardy.writeSync(this._convertedResult);
            }
        });
    }
    copyAsCurl() {
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vscode_1.window.activeTextEditor;
            const document = workspaceUtility_1.getCurrentTextDocument();
            if (!editor || !document) {
                return;
            }
            // Get selected text of selected lines or full document
            let selectedText = new selector_1.Selector().getSelectedText(editor);
            if (!selectedText) {
                return;
            }
            // remove comment lines
            let lines = selectedText.split(Constants.LineSplitterRegex).filter(l => !Constants.CommentIdentifiersRegex.test(l));
            if (lines.length === 0 || lines.every(line => line === '')) {
                return;
            }
            // remove file variables definition lines
            selectedText = arrayUtility_1.ArrayUtility.skipWhile(lines, l => Constants.FileVariableDefinitionRegex.test(l) || l.trim() === '').join(os_1.EOL);
            // variables replacement
            selectedText = yield variableProcessor_1.VariableProcessor.processRawRequest(selectedText);
            // parse http request
            let httpRequest = new requestParserFactory_1.RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, document.fileName);
            if (!httpRequest) {
                return;
            }
            let harHttpRequest = this.convertToHARHttpRequest(httpRequest);
            let snippet = new HTTPSnippet(harHttpRequest);
            let result = snippet.convert('shell', 'curl', process.platform === 'win32' ? { indent: false } : {});
            clipboardy.writeSync(result);
        });
    }
    convertToHARHttpRequest(request) {
        // convert headers
        let headers = [];
        for (let key in request.headers) {
            let headerValue = request.headers[key];
            if (key.toLowerCase() === 'authorization') {
                headerValue = CodeSnippetController.normalizeAuthHeader(headerValue);
            }
            headers.push(new harHttpRequest_1.HARHeader(key, headerValue));
        }
        // convert cookie headers
        let cookies = [];
        let cookieHeader = headers.find(header => header.name.toLowerCase() === 'cookie');
        if (cookieHeader) {
            cookieHeader.value.split(';').forEach(pair => {
                let [headerName, headerValue = ''] = pair.split('=', 2);
                cookies.push(new harHttpRequest_1.HARCookie(headerName.trim(), headerValue.trim()));
            });
        }
        // convert body
        let body = null;
        if (request.body) {
            let contentTypeHeader = headers.find(header => header.name.toLowerCase() === 'content-type');
            let mimeType;
            if (contentTypeHeader) {
                mimeType = contentTypeHeader.value;
            }
            if (typeof request.body === 'string') {
                let normalizedBody = request.body.split(os_1.EOL).reduce((prev, cur) => prev.concat(cur.trim()), '');
                body = new harHttpRequest_1.HARPostData(mimeType, normalizedBody);
            }
            else {
                body = new harHttpRequest_1.HARPostData(mimeType, request.rawBody);
            }
        }
        return new harHttpRequest_1.HARHttpRequest(request.method, encodeUrl(request.url), headers, cookies, body);
    }
    dispose() {
        this._webview.dispose();
    }
    static normalizeAuthHeader(authHeader) {
        if (authHeader) {
            let start = authHeader.indexOf(' ');
            let scheme = authHeader.substr(0, start);
            if (scheme && scheme.toLowerCase() === 'basic') {
                let params = authHeader.substr(start).trim().split(' ');
                if (params.length === 2) {
                    return 'Basic ' + Buffer.from(`${params[0]}:${params[1]}`).toString('base64');
                }
            }
        }
        return authHeader;
    }
}
CodeSnippetController._availableTargets = HTTPSnippet.availableTargets();
__decorate([
    decorator_1.trace('Copy Code Snippet')
], CodeSnippetController.prototype, "copy", null);
__decorate([
    decorator_1.trace('Copy Request As cURL')
], CodeSnippetController.prototype, "copyAsCurl", null);
exports.CodeSnippetController = CodeSnippetController;
//# sourceMappingURL=codeSnippetController.js.map