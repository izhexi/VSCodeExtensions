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
const os_1 = require("os");
const vscode_1 = require("vscode");
const configurationSettings_1 = require("../models/configurationSettings");
const previewOption_1 = require("../models/previewOption");
const mimeUtility_1 = require("../utils/mimeUtility");
const responseFormatUtility_1 = require("../utils/responseFormatUtility");
class HttpResponseTextDocumentView {
    constructor() {
        this.settings = configurationSettings_1.RestClientSettings.Instance;
        this.documents = [];
        vscode_1.workspace.onDidCloseTextDocument(e => {
            const index = this.documents.indexOf(e);
            if (index !== -1) {
                this.documents.splice(index, 1);
            }
        });
    }
    render(response, column) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = this.getTextDocumentContent(response);
            const language = this.getVSCodeDocumentLanguageId(response);
            let document;
            if (this.settings.showResponseInDifferentTab || this.documents.length === 0) {
                document = yield vscode_1.workspace.openTextDocument({ language, content });
                this.documents.push(document);
                yield vscode_1.window.showTextDocument(document, { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus, preview: false });
            }
            else {
                document = this.documents[this.documents.length - 1];
                vscode_1.languages.setTextDocumentLanguage(document, language);
                const editor = yield vscode_1.window.showTextDocument(document, { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus, preview: false });
                editor.edit(edit => {
                    const startPosition = new vscode_1.Position(0, 0);
                    const endPosition = document.lineAt(document.lineCount - 1).range.end;
                    edit.replace(new vscode_1.Range(startPosition, endPosition), content);
                });
            }
        });
    }
    getTextDocumentContent(response) {
        let content = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === previewOption_1.PreviewOption.Exchange) {
            // for add request details
            const request = response.request;
            content += `${request.method} ${request.url} HTTP/1.1${os_1.EOL}`;
            content += this.formatHeaders(request.headers);
            if (request.body) {
                const requestContentType = request.getHeader('content-type');
                if (typeof request.body !== 'string') {
                    request.body = 'NOTE: Request Body From Is File Not Shown';
                }
                content += `${os_1.EOL}${responseFormatUtility_1.ResponseFormatUtility.formatBody(request.body.toString(), requestContentType, true)}${os_1.EOL}`;
            }
            content += os_1.EOL.repeat(2);
        }
        if (previewOption !== previewOption_1.PreviewOption.Body) {
            content += `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${os_1.EOL}`;
            content += this.formatHeaders(response.headers);
        }
        if (previewOption !== previewOption_1.PreviewOption.Headers) {
            const responseContentType = response.getHeader('content-type');
            const prefix = previewOption === previewOption_1.PreviewOption.Body ? '' : os_1.EOL;
            content += `${prefix}${responseFormatUtility_1.ResponseFormatUtility.formatBody(response.body, responseContentType, true)}`;
        }
        return content;
    }
    formatHeaders(headers) {
        let headerString = '';
        for (const header in headers) {
            const value = headers[header];
            headerString += `${header}: ${value}${os_1.EOL}`;
        }
        return headerString;
    }
    getVSCodeDocumentLanguageId(response) {
        if (this.settings.previewOption === previewOption_1.PreviewOption.Body) {
            const contentType = response.getHeader('content-type');
            if (mimeUtility_1.MimeUtility.isJSON(contentType)) {
                return 'json';
            }
            else if (mimeUtility_1.MimeUtility.isJavaScript(contentType)) {
                return 'javascript';
            }
            else if (mimeUtility_1.MimeUtility.isXml(contentType)) {
                return 'xml';
            }
            else if (mimeUtility_1.MimeUtility.isHtml(contentType)) {
                return 'html';
            }
            else if (mimeUtility_1.MimeUtility.isCSS(contentType)) {
                return 'css';
            }
        }
        return 'http';
    }
}
exports.HttpResponseTextDocumentView = HttpResponseTextDocumentView;
//# sourceMappingURL=httpResponseTextDocumentView.js.map