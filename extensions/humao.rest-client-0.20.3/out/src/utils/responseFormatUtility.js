'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const mimeUtility_1 = require("./mimeUtility");
const misc_1 = require("./misc");
const pd = require('pretty-data').pd;
const beautify = require('js-beautify').js_beautify;
class ResponseFormatUtility {
    static formatBody(body, contentType, suppressValidation) {
        if (contentType) {
            if (mimeUtility_1.MimeUtility.isJSON(contentType)) {
                if (misc_1.isJSONString(body)) {
                    body = beautify(body, { indent_size: 2 });
                }
                else if (!suppressValidation) {
                    vscode_1.window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            }
            else if (mimeUtility_1.MimeUtility.isXml(contentType)) {
                body = pd.xml(body);
            }
            else if (mimeUtility_1.MimeUtility.isCSS(contentType)) {
                body = pd.css(body);
            }
            else {
                // Add this for the case that the content type of response body is not very accurate #239
                if (misc_1.isJSONString(body)) {
                    body = beautify(body, { indent_size: 2 });
                }
            }
        }
        return body;
    }
}
exports.ResponseFormatUtility = ResponseFormatUtility;
//# sourceMappingURL=responseFormatUtility.js.map