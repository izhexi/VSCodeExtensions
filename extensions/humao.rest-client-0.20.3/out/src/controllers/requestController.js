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
const configurationSettings_1 = require("../models/configurationSettings");
const httpRequest_1 = require("../models/httpRequest");
const requestParserFactory_1 = require("../models/requestParserFactory");
const requestVariableCacheKey_1 = require("../models/requestVariableCacheKey");
const requestVariableCacheValue_1 = require("../models/requestVariableCacheValue");
const decorator_1 = require("../utils/decorator");
const httpClient_1 = require("../utils/httpClient");
const persistUtility_1 = require("../utils/persistUtility");
const requestStore_1 = require("../utils/requestStore");
const requestVariableCache_1 = require("../utils/requestVariableCache");
const selector_1 = require("../utils/selector");
const variableProcessor_1 = require("../utils/variableProcessor");
const workspaceUtility_1 = require("../utils/workspaceUtility");
const httpResponseTextDocumentView_1 = require("../views/httpResponseTextDocumentView");
const httpResponseWebview_1 = require("../views/httpResponseWebview");
const elegantSpinner = require('elegant-spinner');
const spinner = elegantSpinner();
const filesize = require('filesize');
const uuidv4 = require('uuid/v4');
class RequestController {
    constructor() {
        this._restClientSettings = configurationSettings_1.RestClientSettings.Instance;
        this._requestStore = requestStore_1.RequestStore.Instance;
        this._durationStatusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
        this._sizeStatusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
        this._httpClient = new httpClient_1.HttpClient();
        this._webview = new httpResponseWebview_1.HttpResponseWebview();
        this._webview.onDidCloseAllWebviewPanels(() => {
            this._durationStatusBarItem.hide();
            this._sizeStatusBarItem.hide();
        });
        this._textDocumentView = new httpResponseTextDocumentView_1.HttpResponseTextDocumentView();
        this._outputChannel = vscode_1.window.createOutputChannel('REST');
    }
    run(range) {
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vscode_1.window.activeTextEditor;
            const document = workspaceUtility_1.getCurrentTextDocument();
            if (!editor || !document) {
                return;
            }
            const selector = new selector_1.Selector();
            // Get selected text of selected lines or full document
            let selectedText = selector.getSelectedText(editor, range);
            if (!selectedText) {
                return;
            }
            // parse request variable definition name
            const requestVariable = selector_1.Selector.getRequestVariableDefinitionName(selectedText);
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
            if (requestVariable) {
                httpRequest.requestVariableCacheKey = new requestVariableCacheKey_1.RequestVariableCacheKey(requestVariable, document.uri.toString());
            }
            yield this.runCore(httpRequest);
        });
    }
    rerun() {
        return __awaiter(this, void 0, void 0, function* () {
            let httpRequest = this._requestStore.getLatest();
            if (!httpRequest) {
                return;
            }
            yield this.runCore(httpRequest);
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._requestStore.isCompleted()) {
                return;
            }
            this.clearSendProgressStatusText();
            // cancel current request
            this._requestStore.cancel();
            this._durationStatusBarItem.text = 'Cancelled $(circle-slash)';
            this._durationStatusBarItem.tooltip = null;
        });
    }
    runCore(httpRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            let requestId = uuidv4();
            this._requestStore.add(requestId, httpRequest);
            // clear status bar
            this.setSendingProgressStatusText();
            // set http request
            try {
                let response = yield this._httpClient.send(httpRequest);
                // check cancel
                if (this._requestStore.isCancelled(requestId)) {
                    return;
                }
                this.clearSendProgressStatusText();
                this.formatDurationStatusBar(response);
                this.formatSizeStatusBar(response);
                this._sizeStatusBarItem.show();
                if (httpRequest.requestVariableCacheKey) {
                    requestVariableCache_1.RequestVariableCache.add(httpRequest.requestVariableCacheKey, new requestVariableCacheValue_1.RequestVariableCacheValue(httpRequest, response));
                }
                try {
                    const activeColumn = vscode_1.window.activeTextEditor.viewColumn;
                    const previewColumn = this._restClientSettings.previewColumn === vscode_1.ViewColumn.Active
                        ? activeColumn
                        : (activeColumn + 1);
                    if (this._restClientSettings.previewResponseInUntitledDocument) {
                        this._textDocumentView.render(response, previewColumn);
                    }
                    else {
                        this._webview.render(response, previewColumn);
                    }
                }
                catch (reason) {
                    this._outputChannel.appendLine(reason);
                    this._outputChannel.appendLine(reason.stack);
                    vscode_1.window.showErrorMessage(reason);
                }
                // persist to history json file
                let serializedRequest = httpRequest_1.SerializedHttpRequest.convertFromHttpRequest(httpRequest);
                yield persistUtility_1.PersistUtility.saveRequest(serializedRequest);
            }
            catch (error) {
                // check cancel
                if (this._requestStore.isCancelled(requestId)) {
                    return;
                }
                if (error.code === 'ETIMEDOUT') {
                    error.message = `Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'. Details: ${error}. `;
                }
                else if (error.code === 'ECONNREFUSED') {
                    error.message = `Connection is being rejected. The service isn’t running on the server, or incorrect proxy settings in vscode, or a firewall is blocking requests. Details: ${error}.`;
                }
                else if (error.code === 'ENETUNREACH') {
                    error.message = `You don't seem to be connected to a network. Details: ${error}`;
                }
                this.clearSendProgressStatusText();
                this._durationStatusBarItem.text = '';
                this._outputChannel.appendLine(error);
                this._outputChannel.appendLine(error.stack);
                vscode_1.window.showErrorMessage(error.message);
            }
            finally {
                this._requestStore.complete(requestId);
            }
        });
    }
    dispose() {
        this._durationStatusBarItem.dispose();
        this._sizeStatusBarItem.dispose();
        this._webview.dispose();
    }
    setSendingProgressStatusText() {
        this.clearSendProgressStatusText();
        this._interval = setInterval(() => {
            this._durationStatusBarItem.text = `Waiting ${spinner()}`;
        }, 50);
        this._durationStatusBarItem.tooltip = 'Waiting Response';
        this._durationStatusBarItem.show();
    }
    clearSendProgressStatusText() {
        clearInterval(this._interval);
        this._sizeStatusBarItem.hide();
    }
    formatDurationStatusBar(response) {
        this._durationStatusBarItem.text = ` $(clock) ${response.elapsedMillionSeconds}ms`;
        this._durationStatusBarItem.tooltip = [
            'Breakdown of Duration:',
            `Socket: ${response.timingPhases.wait.toFixed(1)}ms`,
            `DNS: ${response.timingPhases.dns.toFixed(1)}ms`,
            `TCP: ${response.timingPhases.tcp.toFixed(1)}ms`,
            `FirstByte: ${response.timingPhases.firstByte.toFixed(1)}ms`,
            `Download: ${response.timingPhases.download.toFixed(1)}ms`
        ].join(os_1.EOL);
    }
    formatSizeStatusBar(response) {
        this._sizeStatusBarItem.text = ` $(database) ${filesize(response.bodySizeInBytes + response.headersSizeInBytes)}`;
        this._sizeStatusBarItem.tooltip = [
            'Breakdown of Response Size:',
            `Headers: ${filesize(response.headersSizeInBytes)}`,
            `Body: ${filesize(response.bodySizeInBytes)}`
        ].join(os_1.EOL);
    }
}
__decorate([
    decorator_1.trace('Request')
], RequestController.prototype, "run", null);
__decorate([
    decorator_1.trace('Rerun Request')
], RequestController.prototype, "rerun", null);
__decorate([
    decorator_1.trace('Cancel Request')
], RequestController.prototype, "cancel", null);
exports.RequestController = RequestController;
//# sourceMappingURL=requestController.js.map