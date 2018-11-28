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
const Constants = __importStar(require("../../common/constants"));
const variableType_1 = require("../../models/variableType");
const requestVariableProvider_1 = require("./requestVariableProvider");
class FileVariableProvider {
    constructor() {
        this.escapee = new Map([
            ['n', '\n'],
            ['r', '\r'],
            ['t', '\t']
        ]);
        this.innerVariableProviders = [
            requestVariableProvider_1.RequestVariableProvider.Instance,
        ];
        this.type = variableType_1.VariableType.File;
    }
    static get Instance() {
        if (!FileVariableProvider._instance) {
            FileVariableProvider._instance = new FileVariableProvider();
        }
        return FileVariableProvider._instance;
    }
    has(document, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const variables = yield this.getFileVariables(document);
            return variables.some(v => v.name === name);
        });
    }
    get(document, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const variables = yield this.getFileVariables(document);
            const variable = variables.find(v => v.name === name);
            if (!variable) {
                return { name, error: "File variable does not exist" /* FileVariableNotExist */ };
            }
            else {
                return variable;
            }
        });
    }
    getAll(document) {
        return this.getFileVariables(document);
    }
    getFileVariables(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const fileContent = document.getText();
            const variables = [];
            const regex = new RegExp(Constants.FileVariableDefinitionRegex, 'mg');
            let match;
            while (match = regex.exec(fileContent)) {
                const key = match[1];
                const originalValue = yield (this.processFileVariableValue(document, match[2]));
                let value = "";
                let isPrevCharEscape = false;
                for (const currentChar of originalValue) {
                    if (isPrevCharEscape) {
                        isPrevCharEscape = false;
                        value += this.escapee.get(currentChar) || currentChar;
                    }
                    else {
                        if (currentChar === "\\") {
                            isPrevCharEscape = true;
                            continue;
                        }
                        value += currentChar;
                    }
                }
                variables.push({ name: key, value });
            }
            return variables;
        });
    }
    processFileVariableValue(document, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
            let result = '';
            let match;
            let lastIndex = 0;
            variable: while (match = variableReferenceRegex.exec(value)) {
                result += value.substring(lastIndex, match.index);
                lastIndex = variableReferenceRegex.lastIndex;
                const name = match[1].trim();
                const context = { rawRequest: value, parsedRequest: result };
                for (const provider of this.innerVariableProviders) {
                    if (yield provider.has(document, name, context)) {
                        const { value, error, warning } = yield provider.get(document, name, context);
                        if (!error && !warning) {
                            result += value;
                            continue variable;
                        }
                        else {
                            break;
                        }
                    }
                }
                result += `{{${name}}}`;
            }
            result += value.substring(lastIndex);
            return result;
        });
    }
}
exports.FileVariableProvider = FileVariableProvider;
//# sourceMappingURL=fileVariableProvider.js.map