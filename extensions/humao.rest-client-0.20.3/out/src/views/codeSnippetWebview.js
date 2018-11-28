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
const vscode_1 = require("vscode");
const baseWebview_1 = require("./baseWebview");
const hljs = require('highlight.js');
const codeHighlightLinenums = require('code-highlight-linenums');
class CodeSnippetWebview extends baseWebview_1.BaseWebview {
    constructor() {
        super();
        this.codeSnippetPreviewActiveContextKey = 'codeSnippetPreviewFocus';
    }
    get viewType() {
        return 'rest-code-snippet';
    }
    render(convertResult, title, lang) {
        return __awaiter(this, void 0, void 0, function* () {
            let panel;
            if (this.panels.length === 0) {
                panel = vscode_1.window.createWebviewPanel(this.viewType, title, vscode_1.ViewColumn.Two, {
                    enableFindWidget: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [this.styleFolderPath]
                });
                panel.onDidDispose(() => {
                    vscode_1.commands.executeCommand('setContext', this.codeSnippetPreviewActiveContextKey, false);
                    this.panels.pop();
                    this._onDidCloseAllWebviewPanels.fire();
                });
                panel.onDidChangeViewState(({ webviewPanel }) => {
                    vscode_1.commands.executeCommand('setContext', this.codeSnippetPreviewActiveContextKey, webviewPanel.visible);
                });
                this.panels.push(panel);
            }
            else {
                panel = this.panels[0];
                panel.title = title;
            }
            panel.webview.html = this.getHtmlForWebview(convertResult, lang);
            vscode_1.commands.executeCommand('setContext', this.codeSnippetPreviewActiveContextKey, true);
            panel.reveal(vscode_1.ViewColumn.Two);
        });
    }
    dispose() {
        this.panels.forEach(p => p.dispose());
    }
    getHtmlForWebview(convertResult, lang) {
        return `
            <head>
                <link rel="stylesheet" href="${this.styleFilePath}">
            </head>
            <body>
                <div>
                    <pre><code>${codeHighlightLinenums(convertResult, { hljs, lang: this.getHighlightJsLanguageAlias(lang), start: 1 })}</code></pre>
                    <a id="scroll-to-top" role="button" aria-label="scroll to top" onclick="scroll(0,0)"><span class="icon"></span></a>
                </div>
            </body>`;
    }
    getHighlightJsLanguageAlias(lang) {
        if (!lang || lang === 'shell') {
            return 'bash';
        }
        if (lang === 'node') {
            return 'javascript';
        }
        return lang;
    }
}
exports.CodeSnippetWebview = CodeSnippetWebview;
//# sourceMappingURL=codeSnippetWebview.js.map