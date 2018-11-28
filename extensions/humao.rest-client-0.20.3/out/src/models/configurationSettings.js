"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const language_configuration_json_1 = __importDefault(require("../../language-configuration.json"));
const workspaceUtility_1 = require("../utils/workspaceUtility");
const formParamEncodingStrategy_1 = require("./formParamEncodingStrategy");
const previewOption_1 = require("./previewOption");
class RestClientSettings {
    static get Instance() {
        if (!RestClientSettings._instance) {
            RestClientSettings._instance = new RestClientSettings();
        }
        return RestClientSettings._instance;
    }
    constructor() {
        this.brackets = language_configuration_json_1.default.brackets;
        vscode_1.workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
        });
        vscode_1.window.onDidChangeActiveTextEditor((e) => {
            if (e) {
                this.initializeSettings();
            }
        });
        this.initializeSettings();
    }
    initializeSettings() {
        const document = workspaceUtility_1.getCurrentTextDocument();
        const restClientSettings = vscode_1.workspace.getConfiguration("rest-client", document ? document.uri : null);
        this.followRedirect = restClientSettings.get("followredirect", true);
        this.defaultHeaders = restClientSettings.get("defaultHeaders", {
            "User-Agent": "vscode-restclient",
            "Accept-Encoding": "gzip"
        });
        this.showResponseInDifferentTab = restClientSettings.get("showResponseInDifferentTab", false);
        this.rememberCookiesForSubsequentRequests = restClientSettings.get("rememberCookiesForSubsequentRequests", true);
        this.timeoutInMilliseconds = restClientSettings.get("timeoutinmilliseconds", 0);
        if (this.timeoutInMilliseconds < 0) {
            this.timeoutInMilliseconds = 0;
        }
        this.excludeHostsForProxy = restClientSettings.get("excludeHostsForProxy", []);
        this.fontSize = restClientSettings.get("fontSize", null);
        this.fontFamily = restClientSettings.get("fontFamily", null);
        this.fontWeight = restClientSettings.get("fontWeight", null);
        this.environmentVariables = restClientSettings.get("environmentVariables", new Map());
        this.mimeAndFileExtensionMapping = restClientSettings.get("mimeAndFileExtensionMapping", new Map());
        this.previewResponseInUntitledDocument = restClientSettings.get("previewResponseInUntitledDocument", false);
        this.previewColumn = this.parseColumn(restClientSettings.get("previewColumn", "two"));
        this.previewResponsePanelTakeFocus = restClientSettings.get("previewResponsePanelTakeFocus", true);
        this.hostCertificates = restClientSettings.get("certificates", new Map());
        this.disableHighlightResonseBodyForLargeResponse = restClientSettings.get("disableHighlightResonseBodyForLargeResponse", true);
        this.disableAddingHrefLinkForLargeResponse = restClientSettings.get("disableAddingHrefLinkForLargeResponse", true);
        this.largeResponseBodySizeLimitInMB = restClientSettings.get("largeResponseBodySizeLimitInMB", 5);
        this.previewOption = previewOption_1.fromString(restClientSettings.get("previewOption", "full"));
        this.formParamEncodingStrategy = formParamEncodingStrategy_1.fromString(restClientSettings.get("formParamEncodingStrategy", "automatic"));
        this.enableTelemetry = restClientSettings.get('enableTelemetry', true);
        this.showEnvironmentStatusBarItem = restClientSettings.get('showEnvironmentStatusBarItem', true);
        this.addRequestBodyLineIndentationAroundBrackets = restClientSettings.get('addRequestBodyLineIndentationAroundBrackets', true);
        this.decodeEscapedUnicodeCharacters = restClientSettings.get('decodeEscapedUnicodeCharacters', false);
        vscode_1.languages.setLanguageConfiguration('http', { brackets: this.addRequestBodyLineIndentationAroundBrackets ? this.brackets : [] });
        const httpSettings = vscode_1.workspace.getConfiguration("http");
        this.proxy = httpSettings.get('proxy', undefined);
        this.proxyStrictSSL = httpSettings.get('proxyStrictSSL', false);
    }
    parseColumn(value) {
        value = value.toLowerCase();
        switch (value) {
            case 'current':
                return vscode_1.ViewColumn.Active;
            case 'beside':
            default:
                return vscode_1.ViewColumn.Beside;
        }
    }
}
exports.RestClientSettings = RestClientSettings;
//# sourceMappingURL=configurationSettings.js.map