"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
// TESTCODE
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        let a = true;
        if (a) {
            args.sendNotFound();
            completed();
            return;
        }
        try {
            args.executeBuildIn('workspace').then((r) => {
                completed(null, r);
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.GET = GET;
//# sourceMappingURL=test.js.map