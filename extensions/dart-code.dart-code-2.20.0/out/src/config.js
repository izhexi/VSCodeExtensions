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
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
class Config {
    constructor() {
        vscode_1.workspace.onDidChangeConfiguration((e) => this.loadConfig());
        this.loadConfig();
    }
    loadConfig() {
        this.config = vscode_1.workspace.getConfiguration("dart");
    }
    getConfig(key) {
        return this.config.get(key);
    }
    setConfig(key, value, target) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.config.update(key, value, target);
            this.loadConfig(); // TODO: Do we need this or does it get done via onDidChangeConfiguration?
        });
    }
    get allowAnalytics() { return this.getConfig("allowAnalytics"); }
    get analysisServerFolding() { return this.getConfig("analysisServerFolding"); }
    get analyzeAngularTemplates() { return this.getConfig("analyzeAngularTemplates"); }
    get analyzerAdditionalArgs() { return this.getConfig("analyzerAdditionalArgs"); }
    get analyzerDiagnosticsPort() { return this.getConfig("analyzerDiagnosticsPort"); }
    get analyzerInstrumentationLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("analyzerInstrumentationLogFile"))); }
    get analyzerLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("analyzerLogFile"))); }
    get analyzerObservatoryPort() { return this.getConfig("analyzerObservatoryPort"); }
    get analyzerPath() { return utils_1.resolvePaths(this.getConfig("analyzerPath")); }
    get analyzerSshHost() { return this.getConfig("analyzerSshHost"); }
    get checkForSdkUpdates() { return this.getConfig("checkForSdkUpdates"); }
    setCheckForSdkUpdates(value) { return this.setConfig("checkForSdkUpdates", value, vscode_1.ConfigurationTarget.Global); }
    get closingLabels() { return this.getConfig("closingLabels"); }
    get extensionLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("extensionLogFile"))); }
    get flutterCreateAndroidLanguage() { return this.getConfig("flutterCreateAndroidLanguage"); }
    get flutterCreateIOSLanguage() { return this.getConfig("flutterCreateIOSLanguage"); }
    get flutterCreateOrganization() { return this.getConfig("flutterCreateOrganization"); }
    get flutterDaemonLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("flutterDaemonLogFile"))); }
    get flutterHotReloadOnSave() { return this.getConfig("flutterHotReloadOnSave"); }
    get flutterScreenshotPath() { return utils_1.resolvePaths(this.getConfig("flutterScreenshotPath")); }
    get flutterSdkPath() { return utils_1.resolvePaths(this.getConfig("flutterSdkPath")); }
    setFlutterSdkPath(value) { return this.setConfig("flutterSdkPath", value, vscode_1.ConfigurationTarget.Workspace); }
    get flutterSdkPaths() { return (this.getConfig("flutterSdkPaths") || []).map(utils_1.resolvePaths); }
    get flutterSelectDeviceWhenConnected() { return this.getConfig("flutterSelectDeviceWhenConnected"); }
    get normalizeWindowsDriveLetters() { return this.getConfig("normalizeWindowsDriveLetters"); }
    get maxLogLineLength() { return this.getConfig("maxLogLineLength"); }
    get openTestView() { return this.getConfig("openTestView") || []; }
    get openTestViewOnFailure() { return this.openTestView.indexOf("testFailure") !== -1; }
    get openTestViewOnStart() { return this.openTestView.indexOf("testRunStart") !== -1; }
    get reportAnalyzerErrors() { return this.getConfig("reportAnalyzerErrors"); }
    get sdkPath() { return utils_1.resolvePaths(this.getConfig("sdkPath")) || undefined; }
    setSdkPath(value) { return this.setConfig("sdkPath", value, vscode_1.ConfigurationTarget.Workspace); }
    get sdkPaths() { return (this.getConfig("sdkPaths") || []).map(utils_1.resolvePaths); }
    get showTestCodeLens() { return this.getConfig("showTestCodeLens"); }
    get showTodos() { return this.getConfig("showTodos"); }
    get showIgnoreQuickFixes() { return this.getConfig("showIgnoreQuickFixes"); }
    get triggerSignatureHelpAutomatically() { return this.getConfig("triggerSignatureHelpAutomatically"); }
    get warnWhenEditingFilesOutsideWorkspace() { return this.getConfig("warnWhenEditingFilesOutsideWorkspace"); }
    setGlobalDartSdkPath(value) { return this.setConfig("sdkPath", value, vscode_1.ConfigurationTarget.Global); }
    setGlobalFlutterSdkPath(value) { return this.setConfig("flutterSdkPath", value, vscode_1.ConfigurationTarget.Global); }
    // Preview features.
    get previewHotReloadCoverageMarkers() { return this.getConfig("previewHotReloadCoverageMarkers"); }
    get previewBuildRunnerTasks() { return this.getConfig("previewBuildRunnerTasks"); }
    get previewToStringInDebugViews() { return this.getConfig("previewToStringInDebugViews"); }
    for(uri) {
        return new ResourceConfig(uri);
    }
}
class ResourceConfig {
    constructor(uri) {
        this.uri = uri;
        this.config = vscode_1.workspace.getConfiguration("dart", this.uri);
    }
    getConfig(key) {
        return this.config.get(key);
    }
    get debugSdkLibraries() { return this.getConfig("debugSdkLibraries"); }
    get debugExternalLibraries() { return this.getConfig("debugExternalLibraries"); }
    get doNotFormat() { return this.getConfig("doNotFormat"); }
    get enableCompletionCommitCharacters() { return this.getConfig("enableCompletionCommitCharacters"); }
    get evaluateGettersInDebugViews() { return this.getConfig("evaluateGettersInDebugViews"); }
    get flutterTrackWidgetCreation() { return this.getConfig("flutterTrackWidgetCreation"); }
    get flutterTrackWidgetCreationIsConfiguredExplicitly() {
        const trackWidgetCreation = this.config.inspect("flutterTrackWidgetCreation");
        // Return whether any of them are explicitly set, in which case we'll then read normally from the settings.
        return trackWidgetCreation.globalValue !== undefined || trackWidgetCreation.workspaceValue !== undefined || trackWidgetCreation.workspaceFolderValue !== undefined;
    }
    get insertArgumentPlaceholders() { return this.getConfig("insertArgumentPlaceholders"); }
    get lineLength() { return this.getConfig("lineLength"); }
    get pubAdditionalArgs() { return this.getConfig("pubAdditionalArgs"); }
    get runPubGetOnPubspecChanges() { return this.getConfig("runPubGetOnPubspecChanges"); }
    get runPubGetOnPubspecChangesIsConfiguredExplicitly() {
        const runPubGet = this.config.inspect("runPubGetOnPubspecChanges");
        // Return whether any of them are explicitly set, in which case we'll then read normally from the settings.
        return runPubGet.globalValue !== undefined || runPubGet.workspaceValue !== undefined || runPubGet.workspaceFolderValue !== undefined;
    }
    get flutterRunLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("flutterRunLogFile"))); }
    get flutterTestLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("flutterTestLogFile"))); }
    get observatoryLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("observatoryLogFile"))); }
    get pubTestLogFile() { return utils_1.createFolderForFile(utils_1.resolvePaths(this.getConfig("pubTestLogFile"))); }
    get promptToGetPackages() { return this.getConfig("promptToGetPackages"); }
    get vmAdditionalArgs() { return this.getConfig("vmAdditionalArgs"); }
}
class CodeCapabilities {
    constructor(version) {
        this.version = version;
    }
}
exports.CodeCapabilities = CodeCapabilities;
exports.config = new Config();
exports.vsCodeVersion = new CodeCapabilities(vscode_1.version);
//# sourceMappingURL=config.js.map