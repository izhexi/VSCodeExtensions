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
const _ = require("lodash");
const vs = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../debug/utils");
const utils_2 = require("../utils");
const log_1 = require("../utils/log");
const analyzer_gen_1 = require("./analyzer_gen");
class AnalyzerCapabilities {
    static get empty() { return new AnalyzerCapabilities("0.0.0"); }
    constructor(analyzerVersion) {
        this.version = analyzerVersion;
    }
    get mayRequiresPackageFolderWorkaround() { return !utils_2.versionIsAtLeast(this.version, "1.20.1"); }
    get hasCompleteStatementFix() { return utils_2.versionIsAtLeast(this.version, "1.20.2"); }
    get supportsAnalyzingHtmlFiles() { return utils_2.versionIsAtLeast(this.version, "1.18.5"); }
    get supportsPriorityFilesOutsideAnalysisRoots() { return utils_2.versionIsAtLeast(this.version, "1.18.2"); }
    get supportsDiagnostics() { return utils_2.versionIsAtLeast(this.version, "1.18.1"); }
    get supportsClosingLabels() { return utils_2.versionIsAtLeast(this.version, "1.18.4"); }
    get supportsCustomFolding() { return utils_2.versionIsAtLeast(this.version, "1.20.3"); }
    get supportsGetDeclerations() { return utils_2.versionIsAtLeast(this.version, "1.18.7"); }
    get supportsGetDeclerationsForFile() { return utils_2.versionIsAtLeast(this.version, "1.19.0"); }
    get supportsGetSignature() { return utils_2.versionIsAtLeast(this.version, "1.20.5"); }
    get isDart2() { return utils_2.versionIsAtLeast(this.version, "1.19.0"); }
}
exports.AnalyzerCapabilities = AnalyzerCapabilities;
class Analyzer extends analyzer_gen_1.AnalyzerGen {
    constructor(dartVMPath, analyzerPath) {
        super(() => config_1.config.analyzerLogFile, config_1.config.maxLogLineLength);
        this.isAnalyzing = false;
        this.capabilities = AnalyzerCapabilities.empty;
        this.resolvedPromise = Promise.resolve();
        let analyzerArgs = [];
        // Optionally start Observatory for the analyzer.
        if (config_1.config.analyzerObservatoryPort)
            analyzerArgs.push(`--observe=${config_1.config.analyzerObservatoryPort}`);
        analyzerArgs.push(analyzerPath);
        // Optionally start the analyzer's diagnostic web server on the given port.
        if (config_1.config.analyzerDiagnosticsPort)
            analyzerArgs.push(`--port=${config_1.config.analyzerDiagnosticsPort}`);
        // Add info about the extension that will be collected for crash reports etc.
        analyzerArgs.push(`--client-id=Dart-Code.dart-code`);
        analyzerArgs.push(`--client-version=${utils_2.extensionVersion}`);
        // The analysis server supports a verbose instrumentation log file.
        if (config_1.config.analyzerInstrumentationLogFile)
            analyzerArgs.push(`--instrumentation-log-file=${config_1.config.analyzerInstrumentationLogFile}`);
        // Allow arbitrary args to be passed to the analysis server.
        if (config_1.config.analyzerAdditionalArgs)
            analyzerArgs = analyzerArgs.concat(config_1.config.analyzerAdditionalArgs);
        this.launchArgs = analyzerArgs;
        // Hook error subscriptions so we can try and get diagnostic info if this happens.
        this.registerForServerError((e) => this.requestDiagnosticsUpdate());
        this.registerForRequestError((e) => this.requestDiagnosticsUpdate());
        // Register for version.
        this.registerForServerConnected((e) => { this.version = e.version; this.capabilities.version = this.version; });
        let binaryPath = dartVMPath;
        let processArgs = _.clone(analyzerArgs);
        // Since we communicate with the analysis server over STDOUT/STDIN, it is trivial for us
        // to support launching it on a remote machine over SSH. This can be useful if the codebase
        // is being modified remotely over SSHFS, and running the analysis server locally would
        // result in excessive file reading over SSHFS.
        if (config_1.config.analyzerSshHost) {
            binaryPath = "ssh";
            processArgs.unshift(dartVMPath);
            processArgs = [
                // SSH quiet mode, which prevents SSH from interfering with the STDOUT/STDIN communication
                // with the analysis server.
                "-q",
                config_1.config.analyzerSshHost,
                utils_2.escapeShell(processArgs),
            ];
        }
        this.createProcess(undefined, binaryPath, processArgs);
        this.serverSetSubscriptions({
            subscriptions: ["STATUS"],
        });
        this.registerForServerStatus((n) => {
            if (n.analysis) {
                if (n.analysis.isAnalyzing) {
                    this.isAnalyzing = true;
                }
                else {
                    this.isAnalyzing = false;
                    if (this.currentAnalysisCompleter) {
                        this.currentAnalysisCompleter.resolve();
                        this.currentAnalysisCompleter = undefined;
                    }
                }
            }
        });
    }
    get currentAnalysis() {
        if (!this.isAnalyzing)
            return this.resolvedPromise;
        if (!this.currentAnalysisCompleter)
            this.currentAnalysisCompleter = new utils_1.PromiseCompleter();
        return this.currentAnalysisCompleter.promise;
    }
    sendMessage(json) {
        try {
            super.sendMessage(json);
        }
        catch (e) {
            const message = this.version
                ? "The Dart Analyzer has terminated."
                : "The Dart Analyzer could not be started.";
            utils_2.reloadExtension(message, undefined, true);
            throw e;
        }
    }
    shouldHandleMessage(message) {
        // This will include things like Observatory output and some analyzer logging code.
        return !message.startsWith("--- ") && !message.startsWith("+++ ");
    }
    requestDiagnosticsUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastDiagnostics = undefined;
            if (!this.capabilities.supportsDiagnostics)
                return;
            this.lastDiagnostics = (yield this.diagnosticGetDiagnostics()).contexts;
        });
    }
    getLastDiagnostics() {
        return this.lastDiagnostics;
    }
    getAnalyzerLaunchArgs() {
        return this.launchArgs;
    }
    forceNotificationsFor(file) {
        // Send a dummy edit (https://github.com/dart-lang/sdk/issues/30238)
        const files = {};
        files[file] = {
            edits: [{ offset: 0, length: 0, replacement: "", id: "" }],
            type: "change",
        };
        this.analysisUpdateContent({ files });
    }
    // Wraps completionGetSuggestions to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    completionGetSuggestionsResults(request) {
        return this.requestWithStreamedResults(() => this.completionGetSuggestions(request), this.registerForCompletionResults);
    }
    // Wraps searchFindElementReferences to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    searchFindElementReferencesResults(request) {
        return this.requestWithStreamedResults(() => this.searchFindElementReferences(request), this.registerForSearchResults);
    }
    // Wraps searchFindTopLevelDeclarations to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    searchFindTopLevelDeclarationsResults(request) {
        return this.requestWithStreamedResults(() => this.searchFindTopLevelDeclarations(request), this.registerForSearchResults);
    }
    // Wraps searchFindMemberDeclarations to return the final result automatically in the original promise
    // to avoid race conditions.
    // https://github.com/Dart-Code/Dart-Code/issues/471
    searchFindMemberDeclarationsResults(request) {
        return this.requestWithStreamedResults(() => this.searchFindMemberDeclarations(request), this.registerForSearchResults);
    }
    // We need to subscribe before we send the request to avoid races in registering
    // for results (see https://github.com/Dart-Code/Dart-Code/issues/471).
    // Since we don't have the ID yet, we'll have to buffer them for the duration
    // and check inside the buffer when we get the ID back.
    requestWithStreamedResults(sendRequest, registerForResults) {
        return new Promise((resolve, reject) => {
            const buffer = []; // Buffer to store results that come in before we're ready.
            let searchResultsID; // ID that'll be set once we get it back.
            const disposable = registerForResults.bind(this)((notification) => {
                // If we know our ID and this is it, and it's the last result, then resolve.
                if (searchResultsID && notification.id === searchResultsID && notification.isLast) {
                    disposable.dispose();
                    resolve(notification);
                }
                else if (!searchResultsID && notification.isLast) // Otherwise if we didn't know our ID and this might be what we want, stash it.
                    buffer.push(notification);
            });
            // Now we have the above handler set up, send the actual request.
            sendRequest.bind(this)().then((resp) => {
                if (!resp.id) {
                    disposable.dispose();
                    reject();
                }
                // When the ID comes back, stash it...
                searchResultsID = resp.id;
                // And also check the buffer.
                const result = buffer.find((b) => b.id === searchResultsID);
                if (result) {
                    disposable.dispose();
                    resolve(result);
                }
            }, () => reject());
        });
    }
}
exports.Analyzer = Analyzer;
function getSymbolKindForElementKind(kind) {
    switch (kind) {
        case "CLASS":
        case "CLASS_TYPE_ALIAS":
            return vs.SymbolKind.Class;
        case "COMPILATION_UNIT":
            return vs.SymbolKind.Module;
        case "CONSTRUCTOR":
        case "CONSTRUCTOR_INVOCATION":
            return vs.SymbolKind.Constructor;
        case "ENUM":
        case "ENUM_CONSTANT":
            return vs.SymbolKind.Enum;
        case "FIELD":
            return vs.SymbolKind.Field;
        case "FILE":
            return vs.SymbolKind.File;
        case "FUNCTION":
        case "FUNCTION_INVOCATION":
        case "FUNCTION_TYPE_ALIAS":
            return vs.SymbolKind.Function;
        case "GETTER":
            return vs.SymbolKind.Property;
        case "LABEL":
            return vs.SymbolKind.Module;
        case "LIBRARY":
            return vs.SymbolKind.Namespace;
        case "LOCAL_VARIABLE":
            return vs.SymbolKind.Variable;
        case "METHOD":
            return vs.SymbolKind.Method;
        case "PARAMETER":
        case "PREFIX":
            return vs.SymbolKind.Variable;
        case "SETTER":
            return vs.SymbolKind.Property;
        case "TOP_LEVEL_VARIABLE":
        case "TYPE_PARAMETER":
            return vs.SymbolKind.Variable;
        case "UNIT_TEST_GROUP":
            return vs.SymbolKind.Module;
        case "UNIT_TEST_TEST":
            return vs.SymbolKind.Method;
        case "UNKNOWN":
            return vs.SymbolKind.Object;
        default:
            log_1.logError(`Unknown kind: ${kind}`, utils_1.LogCategory.Analyzer);
            return vs.SymbolKind.Object;
    }
}
exports.getSymbolKindForElementKind = getSymbolKindForElementKind;
//# sourceMappingURL=analyzer.js.map