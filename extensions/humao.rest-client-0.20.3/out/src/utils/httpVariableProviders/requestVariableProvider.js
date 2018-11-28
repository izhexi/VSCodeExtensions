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
const requestVariableCacheKey_1 = require("../../models/requestVariableCacheKey");
const variableType_1 = require("../../models/variableType");
const misc_1 = require("../misc");
const requestVariableCache_1 = require("../requestVariableCache");
const requestVariableCacheValueProcessor_1 = require("../requestVariableCacheValueProcessor");
class RequestVariableProvider {
    constructor() {
        this.cache = new Map();
        this.fileMD5Hash = new Map();
        this.type = variableType_1.VariableType.Request;
    }
    static get Instance() {
        if (!RequestVariableProvider._instance) {
            RequestVariableProvider._instance = new RequestVariableProvider();
        }
        return RequestVariableProvider._instance;
    }
    has(document, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const [variableName] = name.trim().split('.');
            const variables = this.getRequestVariables(document);
            return variables.includes(variableName);
        });
    }
    get(document, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const [variableName] = name.trim().split('.');
            const variables = this.getRequestVariables(document);
            if (!variables.includes(variableName)) {
                return { name: variableName, error: "Request variable does not exist" /* RequestVariableNotExist */ };
            }
            const value = requestVariableCache_1.RequestVariableCache.get(new requestVariableCacheKey_1.RequestVariableCacheKey(variableName, document.uri.toString()));
            if (value === undefined) {
                return { name: variableName, warning: "Request variable has not been sent" /* RequestVariableNotSent */ };
            }
            const resolveResult = requestVariableCacheValueProcessor_1.RequestVariableCacheValueProcessor.resolveRequestVariable(value, name);
            return this.convertToHttpVariable(variableName, resolveResult);
        });
    }
    getAll(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const variables = this.getRequestVariables(document);
            return variables.map(v => ({ name: v, value: requestVariableCache_1.RequestVariableCache.get(new requestVariableCacheKey_1.RequestVariableCacheKey(v, document.uri.toString())) }));
        });
    }
    getRequestVariables(document) {
        const file = document.uri.toString();
        const fileContent = document.getText();
        const fileHash = misc_1.calculateMD5Hash(fileContent);
        if (!this.cache.has(file) || fileHash !== this.fileMD5Hash.get(file)) {
            const requestVariableReferenceRegex = new RegExp(Constants.RequestVariableDefinitionWithNameRegexFactory('\\w+'), 'mg');
            const variableNames = new Set();
            let match;
            while (match = requestVariableReferenceRegex.exec(fileContent)) {
                const name = match[1];
                variableNames.add(name);
            }
            this.cache.set(file, [...variableNames]);
            this.fileMD5Hash.set(file, fileHash);
        }
        return this.cache.get(file);
    }
    convertToHttpVariable(name, result) {
        if (result.state === 0 /* Success */) {
            return { name, value: result.value };
        }
        else if (result.state === 1 /* Warning */) {
            return { name, value: result.value, warning: result.message };
        }
        else {
            return { name, error: result.message };
        }
    }
}
exports.RequestVariableProvider = RequestVariableProvider;
//# sourceMappingURL=requestVariableProvider.js.map