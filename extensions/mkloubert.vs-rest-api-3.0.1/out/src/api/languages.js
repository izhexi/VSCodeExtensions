"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
// [GET] /languages
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        vscode.languages.getLanguages().then((languages) => {
            languages = languages || [];
            args.response.data = languages.map(x => rapi_helpers.toStringSafe(x))
                .filter(x => !rapi_helpers.isEmptyString(x));
            args.response.data.sort((x, y) => {
                return rapi_helpers.compareValues(rapi_helpers.normalizeString(x), rapi_helpers.normalizeString(y));
            });
            completed();
        }, (err) => {
            completed(err);
        });
    });
}
exports.GET = GET;
;
//# sourceMappingURL=languages.js.map