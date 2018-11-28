"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const dartdocs_1 = require("../dartdocs");
const utils_1 = require("../utils");
class DartSignatureHelpProvider {
    constructor(analyzer) {
        this.analyzer = analyzer;
    }
    provideSignatureHelp(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield this.analyzer.analysisGetSignature({
                    file: utils_1.fsPath(document.uri),
                    offset: document.offsetAt(position),
                });
                const sig = new vs.SignatureInformation(this.getSignatureLabel(resp), dartdocs_1.cleanDartdoc(resp.dartdoc));
                sig.parameters = resp.parameters.map((p) => new vs.ParameterInformation(this.getLabel(p)));
                const sigs = new vs.SignatureHelp();
                sigs.signatures = [sig];
                sigs.activeSignature = 0;
                // TODO: This isn't implemented in the server yet.
                sigs.activeParameter = -1; // resp.selectedParameterIndex;
                return sigs;
            }
            catch (_a) {
                return undefined;
            }
        });
    }
    getSignatureLabel(resp) {
        const req = resp.parameters.filter((p) => p.kind === "REQUIRED");
        const opt = resp.parameters.filter((p) => p.kind === "OPTIONAL");
        const named = resp.parameters.filter((p) => p.kind === "NAMED");
        const params = [];
        if (req.length)
            params.push(req.map(this.getLabel).join(", "));
        if (opt.length)
            params.push("[" + opt.map(this.getLabel).join(", ") + "]");
        if (named.length)
            params.push("{" + named.map(this.getLabel).join(", ") + "}");
        return `${resp.name}(${params.join(", ")})`;
    }
    getLabel(p) {
        const def = p.defaultValue
            ? p.kind === "NAMED" ? `: ${p.defaultValue}` : ` = ${p.defaultValue}`
            : "";
        return `${p.type} ${p.name}${def}`;
    }
}
exports.DartSignatureHelpProvider = DartSignatureHelpProvider;
//# sourceMappingURL=dart_signature_help_provider.js.map