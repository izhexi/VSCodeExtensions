"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_contracts = require("../../contracts");
const rapi_helpers = require("../../helpers");
function execute(args) {
    let htmlDocs = args.workspaceState[rapi_contracts.VAR_HTML_DOCS];
    let doc;
    let params = rapi_helpers.uriParamsToObject(args.uri);
    let idValue = decodeURIComponent(rapi_helpers.getUrlParam(params, 'id'));
    if (!rapi_helpers.isEmptyString(idValue)) {
        let id = idValue.trim();
        // search for document
        for (let i = 0; i < htmlDocs.length; i++) {
            let d = htmlDocs[i];
            if (rapi_helpers.toStringSafe(d.id).trim() == id) {
                doc = d;
                break;
            }
        }
    }
    let html = '';
    if (doc) {
        if (doc.body) {
            let enc = rapi_helpers.normalizeString(doc.encoding);
            if (!enc) {
                enc = 'utf8';
            }
            html = doc.body.toString(enc);
        }
    }
    return html;
}
exports.execute = execute;
//# sourceMappingURL=html.js.map