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
const fs = require("fs");
const path = require("path");
const vs = require("vscode");
const symbols_1 = require("../src/symbols");
const analyzer_1 = require("./analysis/analyzer");
const analyzer_status_reporter_1 = require("./analysis/analyzer_status_reporter");
const file_change_handler_1 = require("./analysis/file_change_handler");
const open_file_tracker_1 = require("./analysis/open_file_tracker");
const utils_1 = require("./analysis/utils");
const analytics_1 = require("./analytics");
const test_code_lens_provider_1 = require("./code_lens/test_code_lens_provider");
const debug_1 = require("./commands/debug");
const edit_1 = require("./commands/edit");
const go_to_super_1 = require("./commands/go_to_super");
const logging_1 = require("./commands/logging");
const open_in_other_editors_1 = require("./commands/open_in_other_editors");
const refactor_1 = require("./commands/refactor");
const sdk_1 = require("./commands/sdk");
const type_hierarchy_1 = require("./commands/type_hierarchy");
const config_1 = require("./config");
const utils_2 = require("./debug/utils");
const closing_labels_decorations_1 = require("./decorations/closing_labels_decorations");
const hot_reload_coverage_decorations_1 = require("./decorations/hot_reload_coverage_decorations");
const capabilities_1 = require("./flutter/capabilities");
const daemon_message_handler_1 = require("./flutter/daemon_message_handler");
const flutter_daemon_1 = require("./flutter/flutter_daemon");
const hot_reload_save_handler_1 = require("./flutter/hot_reload_save_handler");
const assist_code_action_provider_1 = require("./providers/assist_code_action_provider");
const dart_completion_item_provider_1 = require("./providers/dart_completion_item_provider");
const dart_diagnostic_provider_1 = require("./providers/dart_diagnostic_provider");
const dart_document_symbol_provider_1 = require("./providers/dart_document_symbol_provider");
const dart_folding_provider_1 = require("./providers/dart_folding_provider");
const dart_formatting_edit_provider_1 = require("./providers/dart_formatting_edit_provider");
const dart_highlighting_provider_1 = require("./providers/dart_highlighting_provider");
const dart_hover_provider_1 = require("./providers/dart_hover_provider");
const dart_implementation_provider_1 = require("./providers/dart_implementation_provider");
const dart_language_configuration_1 = require("./providers/dart_language_configuration");
const dart_reference_provider_1 = require("./providers/dart_reference_provider");
const dart_rename_provider_1 = require("./providers/dart_rename_provider");
const dart_signature_help_provider_1 = require("./providers/dart_signature_help_provider");
const dart_workspace_symbol_provider_1 = require("./providers/dart_workspace_symbol_provider");
const debug_config_provider_1 = require("./providers/debug_config_provider");
const fix_code_action_provider_1 = require("./providers/fix_code_action_provider");
const ignore_lint_code_action_provider_1 = require("./providers/ignore_lint_code_action_provider");
const legacy_dart_workspace_symbol_provider_1 = require("./providers/legacy_dart_workspace_symbol_provider");
const refactor_code_action_provider_1 = require("./providers/refactor_code_action_provider");
const snippet_completion_item_provider_1 = require("./providers/snippet_completion_item_provider");
const source_code_action_provider_1 = require("./providers/source_code_action_provider");
const build_runner_task_provider_1 = require("./pub/build_runner_task_provider");
const pub_1 = require("./pub/pub");
const status_bar_version_tracker_1 = require("./sdk/status_bar_version_tracker");
const update_check_1 = require("./sdk/update_check");
const utils_3 = require("./sdk/utils");
const user_prompts_1 = require("./user_prompts");
const util = require("./utils");
const utils_4 = require("./utils");
const log_1 = require("./utils/log");
const packages_view_1 = require("./views/packages_view");
const test_view_1 = require("./views/test_view");
const DART_MODE = [{ language: "dart", scheme: "file" }];
const HTML_MODE = [{ language: "html", scheme: "file" }];
const DART_PROJECT_LOADED = "dart-code:dartProjectLoaded";
const FLUTTER_PROJECT_LOADED = "dart-code:flutterProjectLoaded";
exports.FLUTTER_SUPPORTS_ATTACH = "dart-code:flutterSupportsAttach";
const DART_PLATFORM_NAME = "dart-code:platformName";
exports.SERVICE_EXTENSION_CONTEXT_PREFIX = "dart-code:serviceExtension.";
let analyzer;
let flutterDaemon;
const flutterCapabilities = capabilities_1.FlutterCapabilities.empty;
let analysisRoots = [];
let analytics;
let showTodos;
let previousSettings;
let extensionLogger;
function activate(context, isRestart = false) {
    if (!extensionLogger)
        extensionLogger = log_1.logTo(log_1.getExtensionLogPath(), [utils_2.LogCategory.General]);
    util.logTime("Code called activate");
    // Wire up a reload command that will re-initialise everything.
    context.subscriptions.push(vs.commands.registerCommand("_dart.reloadExtension", (_) => {
        log_1.log("Performing silent extension reload...");
        deactivate(true);
        const toDispose = context.subscriptions.slice();
        context.subscriptions.length = 0;
        for (const sub of toDispose) {
            try {
                sub.dispose();
            }
            catch (e) {
                log_1.logError(e);
            }
        }
        activate(context, true);
        log_1.log("Done!");
    }));
    showTodos = config_1.config.showTodos;
    previousSettings = getSettingsThatRequireRestart();
    exports.extensionPath = context.extensionPath;
    const extensionStartTime = new Date();
    util.logTime();
    const sdks = utils_3.findSdks();
    buildLogHeaders(sdks);
    util.logTime("findSdks");
    analytics = new analytics_1.Analytics(sdks);
    if (!sdks.dart || (sdks.projectType === util.ProjectType.Flutter && !sdks.flutter)) {
        // Don't set anything else up; we can't work like this!
        return utils_3.handleMissingSdks(context, analytics, sdks);
    }
    if (sdks.flutterVersion)
        flutterCapabilities.version = sdks.flutterVersion;
    // Show the SDK version in the status bar.
    if (sdks.dartVersion) {
        analytics.sdkVersion = sdks.dartVersion;
        update_check_1.checkForSdkUpdates(sdks, sdks.dartVersion);
        context.subscriptions.push(new status_bar_version_tracker_1.StatusBarVersionTracker(sdks.projectType, sdks.dartVersion, sdks.flutterVersion, sdks.dartSdkIsFromFlutter));
    }
    // Fire up the analyzer process.
    const analyzerStartTime = new Date();
    const analyzerPath = config_1.config.analyzerPath || path.join(sdks.dart, utils_3.analyzerSnapshotPath);
    // If the ssh host is set, then we are running the analyzer on a remote machine, that same analyzer
    // might not exist on the local machine.
    if (!config_1.config.analyzerSshHost && !fs.existsSync(analyzerPath)) {
        vs.window.showErrorMessage("Could not find a Dart Analysis Server at " + analyzerPath);
        return;
    }
    analyzer = new analyzer_1.Analyzer(path.join(sdks.dart, utils_3.dartVMPath), analyzerPath);
    context.subscriptions.push(analyzer);
    // Log analysis server startup time when we get the welcome message/version.
    const connectedEvents = analyzer.registerForServerConnected((sc) => {
        analytics.analysisServerVersion = sc.version;
        const analyzerEndTime = new Date();
        analytics.logAnalyzerStartupTime(analyzerEndTime.getTime() - analyzerStartTime.getTime());
        connectedEvents.dispose();
    });
    const nextAnalysis = () => new Promise((resolve, reject) => {
        const disposable = analyzer.registerForServerStatus((ss) => {
            if (ss.analysis && !ss.analysis.isAnalyzing) {
                resolve();
                disposable.dispose();
            }
        });
    });
    // Log analysis server first analysis completion time when it completes.
    let analysisStartTime;
    const initialAnalysis = nextAnalysis();
    const analysisCompleteEvents = analyzer.registerForServerStatus((ss) => {
        // Analysis started for the first time.
        if (ss.analysis && ss.analysis.isAnalyzing && !analysisStartTime)
            analysisStartTime = new Date();
        // Analysis ends for the first time.
        if (ss.analysis && !ss.analysis.isAnalyzing && analysisStartTime) {
            const analysisEndTime = new Date();
            analytics.logAnalyzerFirstAnalysisTime(analysisEndTime.getTime() - analysisStartTime.getTime());
            analysisCompleteEvents.dispose();
        }
    });
    // Set up providers.
    // TODO: Do we need to push all these to subscriptions?!
    const hoverProvider = new dart_hover_provider_1.DartHoverProvider(analyzer);
    const formattingEditProvider = new dart_formatting_edit_provider_1.DartFormattingEditProvider(analyzer);
    const completionItemProvider = new dart_completion_item_provider_1.DartCompletionItemProvider(analyzer);
    const referenceProvider = new dart_reference_provider_1.DartReferenceProvider(analyzer);
    const documentHighlightProvider = new dart_highlighting_provider_1.DartDocumentHighlightProvider(analyzer);
    const assistCodeActionProvider = new assist_code_action_provider_1.AssistCodeActionProvider(analyzer);
    const fixCodeActionProvider = new fix_code_action_provider_1.FixCodeActionProvider(analyzer);
    const refactorCodeActionProvider = new refactor_code_action_provider_1.RefactorCodeActionProvider(analyzer);
    const sourceCodeActionProvider = new source_code_action_provider_1.SourceCodeActionProvider(analyzer);
    const ignoreLintCodeActionProvider = new ignore_lint_code_action_provider_1.IgnoreLintCodeActionProvider(analyzer);
    const renameProvider = new dart_rename_provider_1.DartRenameProvider(analyzer);
    const implementationProvider = new dart_implementation_provider_1.DartImplementationProvider(analyzer);
    const activeFileFilters = [DART_MODE];
    if (config_1.config.analyzeAngularTemplates && analyzer.capabilities.supportsAnalyzingHtmlFiles) {
        // Analyze Angular2 templates, requires the angular_analyzer_plugin.
        activeFileFilters.push(HTML_MODE);
    }
    const triggerCharacters = ".: =(${'\"/\\".split("");
    activeFileFilters.forEach((filter) => {
        context.subscriptions.push(vs.languages.registerHoverProvider(filter, hoverProvider));
        context.subscriptions.push(vs.languages.registerDocumentFormattingEditProvider(filter, formattingEditProvider));
        context.subscriptions.push(vs.languages.registerCompletionItemProvider(filter, completionItemProvider, ...triggerCharacters));
        context.subscriptions.push(vs.languages.registerDefinitionProvider(filter, referenceProvider));
        context.subscriptions.push(vs.languages.registerReferenceProvider(filter, referenceProvider));
        context.subscriptions.push(vs.languages.registerDocumentHighlightProvider(filter, documentHighlightProvider));
        context.subscriptions.push(vs.languages.registerCodeActionsProvider(filter, assistCodeActionProvider, assistCodeActionProvider.metadata));
        context.subscriptions.push(vs.languages.registerCodeActionsProvider(filter, fixCodeActionProvider, fixCodeActionProvider.metadata));
        context.subscriptions.push(vs.languages.registerCodeActionsProvider(filter, refactorCodeActionProvider, refactorCodeActionProvider.metadata));
        context.subscriptions.push(vs.languages.registerRenameProvider(filter, renameProvider));
    });
    // Some actions only apply to Dart.
    context.subscriptions.push(vs.languages.registerOnTypeFormattingEditProvider(DART_MODE, formattingEditProvider, "}", ";"));
    context.subscriptions.push(vs.languages.registerCodeActionsProvider(DART_MODE, sourceCodeActionProvider, sourceCodeActionProvider.metadata));
    context.subscriptions.push(vs.languages.registerCodeActionsProvider(DART_MODE, ignoreLintCodeActionProvider, ignoreLintCodeActionProvider.metadata));
    context.subscriptions.push(vs.languages.registerImplementationProvider(DART_MODE, implementationProvider));
    if (config_1.config.showTestCodeLens) {
        const codeLensProvider = new test_code_lens_provider_1.TestCodeLensProvider(analyzer);
        context.subscriptions.push(codeLensProvider);
        context.subscriptions.push(vs.languages.registerCodeLensProvider(DART_MODE, codeLensProvider));
    }
    // Task handlers.
    if (config_1.config.previewBuildRunnerTasks) {
        context.subscriptions.push(vs.tasks.registerTaskProvider("pub", new build_runner_task_provider_1.PubBuildRunnerTaskProvider(sdks)));
    }
    // Attach project-type-specific snippets.
    // Dart snippets aren't registered here (they're in package.json) because VS Code's "tab completion" feature
    // only works with static snippets. This way, that will work for Dart at least.
    // See https://github.com/Dart-Code/Dart-Code/issues/1119.
    context.subscriptions.push(vs.languages.registerCompletionItemProvider(DART_MODE, new snippet_completion_item_provider_1.SnippetCompletionItemProvider("snippets/flutter.json", (uri) => util.isFlutterWorkspaceFolder(vs.workspace.getWorkspaceFolder(uri)))));
    context.subscriptions.push(vs.languages.setLanguageConfiguration(DART_MODE[0].language, new dart_language_configuration_1.DartLanguageConfiguration()));
    const statusReporter = new analyzer_status_reporter_1.AnalyzerStatusReporter(analyzer, sdks, analytics);
    // Set up diagnostics.
    const diagnostics = vs.languages.createDiagnosticCollection("dart");
    context.subscriptions.push(diagnostics);
    const diagnosticsProvider = new dart_diagnostic_provider_1.DartDiagnosticProvider(analyzer, diagnostics);
    // Set the roots, handling project changes that might affect SDKs.
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => recalculateAnalysisRoots()));
    // TODO: Currently calculating analysis roots requires the version to check if
    // we need the package workaround. In future if we stop supporting server < 1.20.1 we
    // can unwrap this call so that it'll start sooner.
    const serverConnected = analyzer.registerForServerConnected((sc) => {
        serverConnected.dispose();
        if (vs.workspace.workspaceFolders)
            recalculateAnalysisRoots();
    });
    // Hook editor changes to send updated contents to analyzer.
    context.subscriptions.push(new file_change_handler_1.FileChangeHandler(analyzer));
    // Fire up Flutter daemon if required.
    if (sdks.projectType === util.ProjectType.Flutter) {
        flutterDaemon = new flutter_daemon_1.FlutterDaemon(path.join(sdks.flutter, utils_3.flutterPath), sdks.flutter);
        context.subscriptions.push(flutterDaemon);
        daemon_message_handler_1.setUpDaemonMessageHandler(context, flutterDaemon);
        hot_reload_save_handler_1.setUpHotReloadOnSave(context, diagnostics);
    }
    util.logTime("All other stuff before debugger..");
    // Set up debug stuff.
    const debugProvider = new debug_config_provider_1.DebugConfigProvider(sdks, analytics, flutterDaemon && flutterDaemon.deviceManager, flutterCapabilities);
    context.subscriptions.push(vs.debug.registerDebugConfigurationProvider("dart", debugProvider));
    context.subscriptions.push(debugProvider);
    // Setup that requires server version/capabilities.
    const connectedSetup = analyzer.registerForServerConnected((sc) => {
        connectedSetup.dispose();
        if (analyzer.capabilities.supportsClosingLabels && config_1.config.closingLabels) {
            context.subscriptions.push(new closing_labels_decorations_1.ClosingLabelsDecorations(analyzer));
        }
        if (analyzer.capabilities.supportsGetDeclerations) {
            context.subscriptions.push(vs.languages.registerWorkspaceSymbolProvider(new dart_workspace_symbol_provider_1.DartWorkspaceSymbolProvider(analyzer)));
        }
        else {
            context.subscriptions.push(vs.languages.registerWorkspaceSymbolProvider(new legacy_dart_workspace_symbol_provider_1.LegacyDartWorkspaceSymbolProvider(analyzer)));
        }
        if (analyzer.capabilities.supportsCustomFolding && config_1.config.analysisServerFolding)
            context.subscriptions.push(vs.languages.registerFoldingRangeProvider(DART_MODE, new dart_folding_provider_1.DartFoldingProvider(analyzer)));
        if (analyzer.capabilities.supportsGetSignature)
            context.subscriptions.push(vs.languages.registerSignatureHelpProvider(DART_MODE, new dart_signature_help_provider_1.DartSignatureHelpProvider(analyzer), ...(config_1.config.triggerSignatureHelpAutomatically ? ["(", ","] : [])));
        const documentSymbolProvider = new dart_document_symbol_provider_1.DartDocumentSymbolProvider(analyzer);
        activeFileFilters.forEach((filter) => {
            context.subscriptions.push(vs.languages.registerDocumentSymbolProvider(filter, documentSymbolProvider));
        });
        context.subscriptions.push(new open_file_tracker_1.OpenFileTracker(analyzer));
    });
    // Handle config changes so we can reanalyze if necessary.
    context.subscriptions.push(vs.workspace.onDidChangeConfiguration(() => handleConfigurationChange(sdks)));
    context.subscriptions.push(vs.workspace.onDidSaveTextDocument((td) => {
        if (path.basename(utils_4.fsPath(td.uri)).toLowerCase() === "pubspec.yaml")
            handleConfigurationChange(sdks);
    }));
    // Handle project changes that might affect SDKs.
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => {
        handleConfigurationChange(sdks);
    }));
    // Register SDK commands.
    const sdkCommands = new sdk_1.SdkCommands(context, sdks, analytics);
    const debug = new debug_1.DebugCommands(context, analytics);
    // Set up commands for Dart editors.
    context.subscriptions.push(new edit_1.EditCommands(context, analyzer));
    context.subscriptions.push(new refactor_1.RefactorCommands(context, analyzer));
    // Register misc commands.
    context.subscriptions.push(new type_hierarchy_1.TypeHierarchyCommand(analyzer));
    context.subscriptions.push(new go_to_super_1.GoToSuperCommand(analyzer));
    context.subscriptions.push(new logging_1.LoggingCommands(context.storagePath));
    context.subscriptions.push(new open_in_other_editors_1.OpenInOtherEditorCommands(sdks));
    // Register our view providers.
    const dartPackagesProvider = new packages_view_1.DartPackagesProvider();
    dartPackagesProvider.setWorkspaces(util.getDartWorkspaceFolders());
    context.subscriptions.push(dartPackagesProvider);
    context.subscriptions.push(vs.window.registerTreeDataProvider("dartPackages", dartPackagesProvider));
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => {
        dartPackagesProvider.setWorkspaces(util.getDartWorkspaceFolders());
    }));
    const testTreeProvider = new test_view_1.TestResultsProvider();
    const testTreeView = vs.window.createTreeView("dartTestTree", { treeDataProvider: testTreeProvider });
    context.subscriptions.push(testTreeProvider, testTreeView, testTreeProvider.onDidStartTests((node) => {
        if (config_1.config.openTestViewOnStart)
            testTreeView.reveal(node);
    }), testTreeProvider.onFirstFailure((node) => {
        if (config_1.config.openTestViewOnFailure)
            testTreeView.reveal(node);
    }), testTreeView.onDidChangeSelection((e) => {
        testTreeProvider.setSelectedNodes(e.selection && e.selection.length === 1 ? e.selection[0] : undefined);
    }));
    if (sdks.projectType !== util.ProjectType.Dart && config_1.config.previewHotReloadCoverageMarkers) {
        context.subscriptions.push(new hot_reload_coverage_decorations_1.HotReloadCoverageDecorations(debug));
    }
    context.subscriptions.push(vs.commands.registerCommand("dart.package.openFile", (filePath) => {
        if (!filePath)
            return;
        vs.workspace.openTextDocument(filePath).then((document) => {
            vs.window.showTextDocument(document, { preview: true });
        }, (error) => log_1.logError);
    }));
    // Warn the user if they've opened a folder with mismatched casing.
    if (vs.workspace.workspaceFolders && vs.workspace.workspaceFolders.length) {
        for (const wf of vs.workspace.workspaceFolders) {
            const userPath = utils_2.forceWindowsDriveLetterToUppercase(utils_4.fsPath(wf.uri));
            const realPath = utils_2.forceWindowsDriveLetterToUppercase(util.trueCasePathSync(userPath));
            if (userPath && realPath && userPath !== realPath) {
                vs.window.showWarningMessage(`The casing of the open workspace folder does not match the casing on the underlying disk; please re-open the folder using the File Open dialog. `
                    + `Expected ${realPath} but got ${userPath}`);
                break;
            }
        }
    }
    // Prompt user for any special config we might want to set.
    if (!isRestart)
        user_prompts_1.showUserPrompts(context);
    // Turn on all the commands.
    setCommandVisiblity(true, sdks.projectType);
    vs.commands.executeCommand("setContext", DART_PLATFORM_NAME, utils_2.platformName);
    // Prompt for pub get if required
    function checkForPackages() {
        // Don't prompt for package updates in the Fuchsia tree.
        if (sdks.projectType === util.ProjectType.Fuchsia)
            return;
        const folders = util.getDartWorkspaceFolders();
        const foldersRequiringPackageGet = folders.filter((ws) => config_1.config.for(ws.uri).promptToGetPackages).filter(pub_1.isPubGetProbablyRequired);
        if (foldersRequiringPackageGet.length > 0)
            pub_1.promptToRunPubGet(foldersRequiringPackageGet);
    }
    context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders((f) => checkForPackages()));
    if (!isRestart)
        checkForPackages();
    // Log how long all this startup took.
    const extensionEndTime = new Date();
    if (isRestart) {
        analytics.logExtensionRestart(extensionEndTime.getTime() - extensionStartTime.getTime());
    }
    else {
        analytics.logExtensionStartup(extensionEndTime.getTime() - extensionStartTime.getTime());
    }
    return {
        [symbols_1.internalApiSymbol]: {
            analyzerCapabilities: analyzer.capabilities,
            currentAnalysis: () => analyzer.currentAnalysis,
            daemonCapabilities: flutterDaemon ? flutterDaemon.capabilities : flutter_daemon_1.DaemonCapabilities.empty,
            debugProvider,
            flutterCapabilities,
            initialAnalysis,
            nextAnalysis,
            reanalyze,
            renameProvider,
            sdks,
            testTreeProvider,
        },
    };
}
exports.activate = activate;
function buildLogHeaders(sdks) {
    log_1.clearLogHeader();
    log_1.addToLogHeader(() => `!! PLEASE REVIEW THIS LOG FOR SENSITIVE INFORMATION BEFORE SHARING !!`);
    log_1.addToLogHeader(() => ``);
    log_1.addToLogHeader(() => `Dart Code extension: ${util.extensionVersion}`);
    log_1.addToLogHeader(() => `Flutter extension: ${vs.extensions.getExtension(utils_2.flutterExtensionIdentifier).packageJSON.version}`);
    log_1.addToLogHeader(() => `VS Code: ${vs.version}`);
    log_1.addToLogHeader(() => `Platform: ${utils_2.platformName}`);
    log_1.addToLogHeader(() => `Workspace type: ${util.ProjectType[sdks.projectType]}`);
    log_1.addToLogHeader(() => `Multi-root?: ${vs.workspace.workspaceFolders && vs.workspace.workspaceFolders.length > 1}`);
    log_1.addToLogHeader(() => `Dart SDK:\n    Loc: ${sdks.dart}\n    Ver: ${util.getSdkVersion(sdks.dart)}`);
    log_1.addToLogHeader(() => `Flutter SDK:\n    Loc: ${sdks.flutter}\n    Ver: ${util.getSdkVersion(sdks.flutter)}`);
}
function recalculateAnalysisRoots() {
    let newRoots = [];
    util.getDartWorkspaceFolders().forEach((f) => {
        newRoots = newRoots.concat(utils_1.findPackageRoots(analyzer, utils_4.fsPath(f.uri)));
    });
    analysisRoots = newRoots;
    // Sometimes people open their home directories as the workspace root and
    // have all sorts of performance issues because of PubCache and AppData folders
    // so we will exclude them if the user has opened a parent folder (opening a
    // child of these directly will still work).
    const excludeFolders = [];
    if (utils_2.isWin) {
        const addExcludeIfRequired = (folder) => {
            if (!folder || !path.isAbsolute(folder))
                return;
            const containingRoot = analysisRoots.find((root) => utils_2.isWithinPath(folder, root));
            if (containingRoot) {
                log_1.log(`Excluding folder ${folder} from analysis roots as it is a child of analysis root ${containingRoot} and may cause performance issues.`);
                excludeFolders.push(folder);
            }
        };
        addExcludeIfRequired(process.env.PUB_CACHE);
        addExcludeIfRequired(process.env.APPDATA);
        addExcludeIfRequired(process.env.LOCALAPPDATA);
    }
    analyzer.analysisSetAnalysisRoots({
        excluded: excludeFolders,
        included: analysisRoots,
    });
}
function handleConfigurationChange(sdks) {
    // TODOs
    const newShowTodoSetting = config_1.config.showTodos;
    const todoSettingChanged = showTodos !== newShowTodoSetting;
    showTodos = newShowTodoSetting;
    // SDK
    const newSettings = getSettingsThatRequireRestart();
    const settingsChanged = previousSettings !== newSettings;
    previousSettings = newSettings;
    if (todoSettingChanged) {
        reanalyze();
    }
    if (settingsChanged) {
        util.reloadExtension();
    }
}
function reanalyze() {
    analyzer.analysisReanalyze({
        roots: analysisRoots,
    });
}
function getSettingsThatRequireRestart() {
    // The return value here is used to detect when any config option changes that requires a project reload.
    // It doesn't matter how these are combined; it just gets called on every config change and compared.
    // Usually these are options that affect the analyzer and need a reload, but config options used at
    // activation time will also need to be included.
    return "CONF-"
        + config_1.config.sdkPath
        + config_1.config.analyzerPath
        + config_1.config.analyzerDiagnosticsPort
        + config_1.config.analyzerObservatoryPort
        + config_1.config.analyzerInstrumentationLogFile
        + config_1.config.extensionLogFile
        + config_1.config.analyzerAdditionalArgs
        + config_1.config.flutterSdkPath
        + config_1.config.closingLabels
        + config_1.config.analyzeAngularTemplates
        + config_1.config.normalizeWindowsDriveLetters
        + config_1.config.analysisServerFolding
        + config_1.config.showTestCodeLens
        + config_1.config.previewHotReloadCoverageMarkers
        + config_1.config.previewBuildRunnerTasks
        + config_1.config.triggerSignatureHelpAutomatically;
}
function deactivate(isRestart = false) {
    return __awaiter(this, void 0, void 0, function* () {
        setCommandVisiblity(false, null);
        vs.commands.executeCommand("setContext", exports.FLUTTER_SUPPORTS_ATTACH, false);
        if (!isRestart) {
            vs.commands.executeCommand("setContext", debug_config_provider_1.HAS_LAST_DEBUG_CONFIG, false);
            yield analytics.logExtensionShutdown();
            if (extensionLogger)
                yield extensionLogger.dispose();
        }
    });
}
exports.deactivate = deactivate;
function setCommandVisiblity(enable, projectType) {
    vs.commands.executeCommand("setContext", DART_PROJECT_LOADED, enable);
    vs.commands.executeCommand("setContext", FLUTTER_PROJECT_LOADED, enable && projectType === util.ProjectType.Flutter);
}
//# sourceMappingURL=extension.js.map