'use strict';
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
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const Constants = __importStar(require("../common/constants"));
const previewOption_1 = require("../models/previewOption");
const dispose_1 = require("../utils/dispose");
const mimeUtility_1 = require("../utils/mimeUtility");
const misc_1 = require("../utils/misc");
const responseFormatUtility_1 = require("../utils/responseFormatUtility");
const baseWebview_1 = require("./baseWebview");
const autoLinker = require('autolinker');
const hljs = require('highlight.js');
class HttpResponseWebview extends baseWebview_1.BaseWebview {
    constructor() {
        super();
        this.httpResponsePreviewActiveContextKey = 'httpResponsePreviewFocus';
        // Init response webview map
        this.panelResponses = new Map();
        this.iconFilePath = vscode_1.Uri.file(path.join(this.extensionPath, Constants.ImagesFolderName, Constants.IconFileName));
    }
    get viewType() {
        return 'rest-response';
    }
    render(response, column) {
        return __awaiter(this, void 0, void 0, function* () {
            let panel;
            if (this.settings.showResponseInDifferentTab || this.panels.length === 0) {
                panel = vscode_1.window.createWebviewPanel(this.viewType, `Response(${response.elapsedMillionSeconds}ms)`, { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus }, {
                    enableFindWidget: true,
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [this.styleFolderPath, this.scriptFolderPath]
                });
                panel.onDidDispose(() => {
                    const response = this.panelResponses.get(panel);
                    if (response === HttpResponseWebview.activePreviewResponse) {
                        vscode_1.commands.executeCommand('setContext', this.httpResponsePreviewActiveContextKey, false);
                        HttpResponseWebview.activePreviewResponse = undefined;
                    }
                    const index = this.panels.findIndex(v => v === panel);
                    if (index !== -1) {
                        this.panels.splice(index, 1);
                        this.panelResponses.delete(panel);
                    }
                    if (this.panels.length === 0) {
                        this._onDidCloseAllWebviewPanels.fire();
                    }
                });
                panel.iconPath = this.iconFilePath;
                panel.onDidChangeViewState(({ webviewPanel }) => {
                    vscode_1.commands.executeCommand('setContext', this.httpResponsePreviewActiveContextKey, webviewPanel.active);
                    HttpResponseWebview.activePreviewResponse = webviewPanel.active ? this.panelResponses.get(webviewPanel) : undefined;
                });
                this.panels.push(panel);
            }
            else {
                panel = this.panels[this.panels.length - 1];
                panel.title = `Response(${response.elapsedMillionSeconds}ms)`;
            }
            panel.webview.html = this.getHtmlForWebview(response);
            vscode_1.commands.executeCommand('setContext', this.httpResponsePreviewActiveContextKey, this.settings.previewResponsePanelTakeFocus);
            panel.reveal(column, !this.settings.previewResponsePanelTakeFocus);
            this.panelResponses.set(panel, response);
            HttpResponseWebview.activePreviewResponse = response;
        });
    }
    dispose() {
        dispose_1.disposeAll(this.panels);
    }
    getHtmlForWebview(response) {
        let innerHtml;
        let width = 2;
        let contentType = response.getHeader("content-type");
        if (contentType) {
            contentType = contentType.trim();
        }
        if (contentType && mimeUtility_1.MimeUtility.isBrowserSupportedImageFormat(contentType)) {
            innerHtml = `<img src="data:${contentType};base64,${response.bodyBuffer.toString('base64')}">`;
        }
        else {
            let code = this.highlightResponse(response);
            width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
            innerHtml = `<pre><code>${this.addLineNums(code)}</code></pre>`;
        }
        return `
    <head>
        <link rel="stylesheet" type="text/css" href="${this.styleFilePath}">
        ${this.getSettingsOverrideStyles(width)}
    </head>
    <body>
        <div>
            ${this.settings.disableAddingHrefLinkForLargeResponse && response.bodySizeInBytes > this.settings.largeResponseBodySizeLimitInMB * 1024 * 1024
            ? innerHtml
            : this.addUrlLinks(innerHtml)}
            <a id="scroll-to-top" role="button" aria-label="scroll to top" onclick="scroll(0,0)"><span class="icon"></span></a>
        </div>
        <script type="text/javascript" src="${this.scriptFilePath}" charset="UTF-8"></script>
    </body>`;
    }
    highlightResponse(response) {
        let code = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === previewOption_1.PreviewOption.Exchange) {
            // for add request details
            let request = response.request;
            let requestNonBodyPart = `${request.method} ${request.url} HTTP/1.1
${HttpResponseWebview.formatHeaders(request.headers)}`;
            code += hljs.highlight('http', requestNonBodyPart + '\r\n').value;
            if (request.body) {
                let requestContentType = request.getHeader("content-type");
                if (typeof request.body !== 'string') {
                    request.body = 'NOTE: Request Body From File Is Not Shown';
                }
                let requestBodyPart = `${responseFormatUtility_1.ResponseFormatUtility.formatBody(request.body, requestContentType, true)}`;
                let bodyLanguageAlias = HttpResponseWebview.getHighlightLanguageAlias(requestContentType, request.body);
                if (bodyLanguageAlias) {
                    code += hljs.highlight(bodyLanguageAlias, requestBodyPart).value;
                }
                else {
                    code += hljs.highlightAuto(requestBodyPart).value;
                }
                code += '\r\n';
            }
            code += '\r\n'.repeat(2);
        }
        if (previewOption !== previewOption_1.PreviewOption.Body) {
            let responseNonBodyPart = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}
${HttpResponseWebview.formatHeaders(response.headers)}`;
            code += hljs.highlight('http', responseNonBodyPart + (previewOption !== previewOption_1.PreviewOption.Headers ? '\r\n' : '')).value;
        }
        if (previewOption !== previewOption_1.PreviewOption.Headers) {
            let responseContentType = response.getHeader("content-type");
            let responseBodyPart = `${responseFormatUtility_1.ResponseFormatUtility.formatBody(response.body, responseContentType, this.settings.suppressResponseBodyContentTypeValidationWarning)}`;
            if (this.settings.disableHighlightResonseBodyForLargeResponse &&
                response.bodySizeInBytes > this.settings.largeResponseBodySizeLimitInMB * 1024 * 1024) {
                code += responseBodyPart;
            }
            else {
                let bodyLanguageAlias = HttpResponseWebview.getHighlightLanguageAlias(responseContentType, responseBodyPart);
                if (bodyLanguageAlias) {
                    code += hljs.highlight(bodyLanguageAlias, responseBodyPart).value;
                }
                else {
                    code += hljs.highlightAuto(responseBodyPart).value;
                }
            }
        }
        return code;
    }
    getSettingsOverrideStyles(width) {
        return [
            '<style>',
            (this.settings.fontFamily || this.settings.fontSize || this.settings.fontWeight ? [
                'code {',
                this.settings.fontFamily ? `font-family: ${this.settings.fontFamily};` : '',
                this.settings.fontSize ? `font-size: ${this.settings.fontSize}px;` : '',
                this.settings.fontWeight ? `font-weight: ${this.settings.fontWeight};` : '',
                '}',
            ] : []).join('\n'),
            'code .line {',
            `padding-left: calc(${width}ch + 20px );`,
            '}',
            'code .line:before {',
            `width: ${width}ch;`,
            `margin-left: calc(-${width}ch + -30px );`,
            '}',
            '.line .icon {',
            `left: calc(${width}ch + 3px)`,
            '}',
            '.line.collapsed .icon {',
            `left: calc(${width}ch + 3px)`,
            '}',
            '</style>'
        ].join('\n');
    }
    addLineNums(code) {
        code = code.replace(/([\r\n]\s*)(<\/span>)/ig, '$2$1');
        code = this.cleanLineBreaks(code);
        code = code.split(/\r\n|\r|\n/);
        let max = (1 + code.length).toString().length;
        const foldingRanges = this.getFoldingRange(code);
        code = code
            .map(function (line, i) {
            const lineNum = i + 1;
            const range = foldingRanges.has(lineNum)
                ? ` range-start="${foldingRanges.get(lineNum).start}" range-end="${foldingRanges.get(lineNum).end}"`
                : '';
            const folding = foldingRanges.has(lineNum) ? '<span class="icon"></span>' : '';
            return `<span class="line width-${max}" start="${lineNum}"${range}>${line}${folding}</span>`;
        })
            .join('\n');
        return code;
    }
    cleanLineBreaks(code) {
        let openSpans = [], matcher = /<\/?span[^>]*>|\r\n|\r|\n/ig, newline = /\r\n|\r|\n/, closingTag = /^<\//;
        return code.replace(matcher, function (match) {
            if (newline.test(match)) {
                if (openSpans.length) {
                    return openSpans.map(() => '</span>').join('') + match + openSpans.join('');
                }
                else {
                    return match;
                }
            }
            else if (closingTag.test(match)) {
                openSpans.pop();
                return match;
            }
            else {
                openSpans.push(match);
                return match;
            }
        });
    }
    addUrlLinks(innerHtml) {
        return autoLinker.link(innerHtml, {
            urls: {
                schemeMatches: true,
                wwwMatches: true,
                tldMatches: false
            },
            email: false,
            phone: false,
            stripPrefix: false,
            stripTrailingSlash: false,
            decodePercentEncoding: false
        });
    }
    getFoldingRange(lines) {
        const result = new Map();
        const stack = [];
        const leadingSpaceCount = lines
            .map((line, index) => [index, line.search(/\S/)])
            .filter(([, num]) => num !== -1);
        for (const [index, [lineIndex, count]] of leadingSpaceCount.entries()) {
            if (index === 0) {
                continue;
            }
            const [prevLineIndex, prevCount] = leadingSpaceCount[index - 1];
            if (prevCount < count) {
                stack.push([prevLineIndex, prevCount]);
            }
            else if (prevCount > count) {
                let prev;
                while ((prev = stack.slice(-1)[0]) && (prev[1] >= count)) {
                    stack.pop();
                    result.set(prev[0] + 1, new FoldingRange(prev[0] + 1, lineIndex));
                }
            }
        }
        return result;
    }
    static formatHeaders(headers) {
        let headerString = '';
        for (let header in headers) {
            if (headers.hasOwnProperty(header)) {
                let value = headers[header];
                if (typeof headers[header] !== 'string') {
                    value = headers[header];
                }
                headerString += `${header}: ${value}\n`;
            }
        }
        return headerString;
    }
    static getHighlightLanguageAlias(contentType, content = null) {
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
        else {
            // If content is provided, guess from content if not content type is matched
            if (content) {
                if (misc_1.isJSONString(content)) {
                    return 'json';
                }
            }
            return null;
        }
    }
}
exports.HttpResponseWebview = HttpResponseWebview;
class FoldingRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}
//# sourceMappingURL=httpResponseWebview.js.map