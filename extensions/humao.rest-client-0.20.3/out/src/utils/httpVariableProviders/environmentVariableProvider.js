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
const environmentController_1 = require("../../controllers/environmentController");
const configurationSettings_1 = require("../../models/configurationSettings");
const variableType_1 = require("../../models/variableType");
class EnvironmentVariableProvider {
    constructor() {
        this._settings = configurationSettings_1.RestClientSettings.Instance;
        this.type = variableType_1.VariableType.Environment;
    }
    static get Instance() {
        if (!EnvironmentVariableProvider._instance) {
            EnvironmentVariableProvider._instance = new EnvironmentVariableProvider();
        }
        return EnvironmentVariableProvider._instance;
    }
    has(document, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const variables = yield this.getAvailableVariables();
            return name in variables;
        });
    }
    get(document, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const variables = yield this.getAvailableVariables();
            if (!(name in variables)) {
                return { name, error: "Environment variable does not exist" /* EnvironmentVariableNotExist */ };
            }
            return { name, value: variables[name] };
        });
    }
    getAll(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const variables = yield this.getAvailableVariables();
            return Object.keys(variables).map(key => ({ name: key, value: variables[key] }));
        });
    }
    getAvailableVariables() {
        return __awaiter(this, void 0, void 0, function* () {
            const { name: environmentName } = yield environmentController_1.EnvironmentController.getCurrentEnvironment();
            const variables = this._settings.environmentVariables;
            const currentEnvironmentVariables = variables[environmentName];
            const sharedEnvironmentVariables = variables[environmentController_1.EnvironmentController.sharedEnvironmentName];
            return Object.assign({}, sharedEnvironmentVariables, currentEnvironmentVariables);
        });
    }
}
exports.EnvironmentVariableProvider = EnvironmentVariableProvider;
//# sourceMappingURL=environmentVariableProvider.js.map