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
const net = require("net");
const path = require("path");
const vs = require("vscode");
const vscode_1 = require("vscode");
const debug_1 = require("../commands/debug");
const config_1 = require("../config");
const dart_debug_impl_1 = require("../debug/dart_debug_impl");
const dart_test_debug_impl_1 = require("../debug/dart_test_debug_impl");
const flutter_debug_impl_1 = require("../debug/flutter_debug_impl");
const flutter_test_debug_impl_1 = require("../debug/flutter_test_debug_impl");
const utils_1 = require("../debug/utils");
const project_1 = require("../project");
const utils_2 = require("../sdk/utils");
const utils_3 = require("../utils");
const log_1 = require("../utils/log");
const test_view_1 = require("../views/test_view");
exports.TRACK_WIDGET_CREATION_ENABLED = "dart-code:trackWidgetCreationEnabled";
exports.HAS_LAST_DEBUG_CONFIG = "dart-code:hasLastDebugConfig";
class DebugConfigProvider {
    constructor(sdks, analytics, deviceManager, flutterCapabilities) {
        this.sdks = sdks;
        this.analytics = analytics;
        this.deviceManager = deviceManager;
        this.flutterCapabilities = flutterCapabilities;
        this.debugServers = {};
        this.sdks = sdks;
        this.analytics = analytics;
        this.deviceManager = deviceManager;
    }
    provideDebugConfigurations(folder, token) {
        const isFlutter = utils_3.isFlutterWorkspaceFolder(folder);
        return [{
                name: isFlutter ? "Flutter" : "Dart",
                program: isFlutter ? undefined : "bin/main.dart",
                request: "launch",
                type: "dart",
            }];
    }
    resolveDebugConfiguration(folder, debugConfig, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const openFile = vscode_1.window.activeTextEditor && vscode_1.window.activeTextEditor.document ? utils_3.fsPath(vscode_1.window.activeTextEditor.document.uri) : null;
            const isFullTestRun = debugConfig && debugConfig.runner === "tests";
            const allowProgramlessRun = isFullTestRun;
            function resolveVariables(input) {
                if (!input)
                    return input;
                if (input === "${file}")
                    return openFile;
                if (!folder)
                    return input;
                return input.replace(/\${workspaceFolder}/, utils_3.fsPath(folder.uri));
            }
            log_1.log(`Starting debug session...`);
            if (folder)
                log_1.log(`    workspace: ${utils_3.fsPath(folder.uri)}`);
            if (debugConfig.program)
                log_1.log(`    program  : ${debugConfig.program}`);
            if (debugConfig.cwd)
                log_1.log(`    cwd      : ${debugConfig.cwd}`);
            debugConfig.program = resolveVariables(debugConfig.program);
            debugConfig.cwd = resolveVariables(debugConfig.cwd);
            if (openFile && !folder) {
                folder = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(openFile));
                if (folder)
                    log_1.log(`Setting workspace based on open file: ${utils_3.fsPath(folder.uri)}`);
            }
            else if (!folder && vs.workspace.workspaceFolders && vs.workspace.workspaceFolders.length === 1) {
                folder = vs.workspace.workspaceFolders[0];
                if (folder)
                    log_1.log(`Setting workspace based on single open workspace: ${utils_3.fsPath(folder.uri)}`);
            }
            const isAttachRequest = debugConfig.request === "attach";
            if (!isAttachRequest) {
                // If there's no program set, try to guess one.
                if (!allowProgramlessRun)
                    debugConfig.program = debugConfig.program || this.guessBestEntryPoint(openFile, folder);
                // If we still don't have an entry point, the user will have to provide it.
                if (!allowProgramlessRun && !debugConfig.program) {
                    log_1.logWarn("No program was set and programlessRun is not allowed");
                    vscode_1.window.showInformationMessage("Set the 'program' value in your launch config (eg 'bin/main.dart') then launch again");
                    return null; // null means open launch.json.
                }
            }
            // Convert `program` to an absolute path (if possible).
            if (debugConfig.program && !path.isAbsolute(debugConfig.program) && (debugConfig.cwd || folder)) {
                debugConfig.program = path.join(debugConfig.cwd || utils_3.fsPath(folder.uri), debugConfig.program);
                log_1.log(`Converted program to absolute path: ${debugConfig.program}`);
            }
            // If we don't have a cwd then find the best one from the project root.
            if (!debugConfig.cwd && folder) {
                debugConfig.cwd = utils_3.fsPath(folder.uri);
                log_1.log(`Using workspace as cwd: ${debugConfig.cwd}`);
                // If we have an entry point, see if we can make this more specific by finding a .packages file
                if (debugConfig.program) {
                    const bestProjectRoot = project_1.locateBestProjectRoot(debugConfig.program);
                    if (bestProjectRoot) {
                        if (!folder || utils_1.isWithinPath(bestProjectRoot, utils_3.fsPath(folder.uri))) {
                            debugConfig.cwd = bestProjectRoot;
                            log_1.log(`Found better project root to use as cwd: ${debugConfig.cwd}`);
                        }
                    }
                }
            }
            // Ensure we have a full path.
            if (debugConfig.program && debugConfig.cwd && !path.isAbsolute(debugConfig.program))
                debugConfig.program = path.join(debugConfig.cwd, debugConfig.program);
            const isFlutter = this.sdks.projectType !== utils_3.ProjectType.Dart
                && debugConfig.cwd && utils_3.isFlutterProjectFolder(debugConfig.cwd)
                && !utils_3.isInsideFolderNamed(debugConfig.program, "bin") && !utils_3.isInsideFolderNamed(debugConfig.program, "tool");
            log_1.log(`Detected launch project as ${isFlutter ? "Flutter" : "Dart"}`);
            const isTest = isFullTestRun || (debugConfig.program && utils_3.isTestFile(debugConfig.program));
            if (isTest)
                log_1.log(`Detected launch project as a Test project`);
            const canPubRunTest = isTest && debugConfig.cwd && utils_3.projectSupportsPubRunTest(debugConfig.cwd);
            if (isTest && !canPubRunTest)
                log_1.log(`Project does not appear to support 'pub run test', will use VM directly`);
            const debugType = isFlutter
                ? (isTest ? DebuggerType.FlutterTest : DebuggerType.Flutter)
                : (isTest && canPubRunTest ? DebuggerType.PubTest : DebuggerType.Dart);
            log_1.log(`Using ${DebuggerType[debugType]} debug adapter for this session`);
            // If we're attaching to Dart, ensure we get an observatory URI.
            if (isAttachRequest) {
                // For attaching, the Observatory address must be specified. If it's not provided already, prompt for it.
                if (!isFlutter) { // TEMP Condition because there's no point asking yet as the user doesn't know how to get this..
                    debugConfig.observatoryUri = yield this.getObservatoryUri(debugConfig.observatoryUri /*, mostRecentAttachedProbablyReusableObservatoryUri*/);
                }
                if (!debugConfig.observatoryUri && !isFlutter) {
                    log_1.logWarn("No Observatory URI/port was provided");
                    vscode_1.window.showInformationMessage("You must provide an Observatory URI/port to attach a debugger");
                    return undefined; // undefined means silent (don't open launch.json).
                }
            }
            // Ensure we have a device
            const deviceId = this.deviceManager && this.deviceManager.currentDevice ? this.deviceManager.currentDevice.id : null;
            if (isFlutter && !isTest && !deviceId && this.deviceManager && debugConfig.deviceId !== "flutter-tester") {
                // Fetch a list of emulators
                if (!(yield this.deviceManager.promptForAndLaunchEmulator(true))) {
                    log_1.logWarn("Unable to launch due to no active device");
                    vscode_1.window.showInformationMessage("Cannot launch without an active device");
                    return undefined; // undefined means silent (don't open launch.json).
                }
            }
            // TODO: This cast feels nasty?
            this.setupDebugConfig(folder, debugConfig, isFlutter, deviceId);
            // Debugger always uses uppercase drive letters to ensure our paths have them regardless of where they came from.
            debugConfig.program = utils_1.forceWindowsDriveLetterToUppercase(debugConfig.program);
            debugConfig.cwd = utils_1.forceWindowsDriveLetterToUppercase(debugConfig.cwd);
            // Start port listener on launch of first debug session.
            const debugServer = this.getDebugServer(debugType, debugConfig.debugServer);
            // Make VS Code connect to debug server instead of launching debug adapter.
            // TODO: Why do we need this cast? The node-mock-debug does not?
            debugConfig.debugServer = debugServer.address().port;
            this.analytics.logDebuggerStart(folder && folder.uri);
            if (debugType === DebuggerType.FlutterTest || debugType === DebuggerType.PubTest) {
                const isRunningTestSubset = debugConfig.args && (debugConfig.args.indexOf("--name") !== -1 || debugConfig.args.indexOf("--pname") !== -1);
                test_view_1.TestResultsProvider.flagSuiteStart(debugConfig.program, !isRunningTestSubset);
            }
            log_1.log(`Debug session starting...\n    ${JSON.stringify(debugConfig, undefined, 4).replace(/\n/g, "\n    ")}`);
            // Stash the config to support the "rerun last test(s)" command.
            debug_1.LastDebugSession.workspaceFolder = folder;
            debug_1.LastDebugSession.debugConfig = Object.assign({}, debugConfig);
            vs.commands.executeCommand("setContext", exports.HAS_LAST_DEBUG_CONFIG, true);
            return debugConfig;
        });
    }
    guessBestEntryPoint(openFile, workspaceFolder) {
        // For certain open files, assume the user wants to run them.
        if (utils_3.isTestFile(openFile) || utils_3.isInsideFolderNamed(openFile, "bin") || utils_3.isInsideFolderNamed(openFile, "tool")) {
            log_1.log(`Using open file as entry point: ${openFile}`);
            return openFile;
        }
        // Use the open file as a clue to find the best project root, then search from there.
        const projectRoot = project_1.locateBestProjectRoot(openFile) || utils_3.fsPath(workspaceFolder.uri);
        if (!projectRoot)
            return;
        const commonLaunchPaths = [
            path.join(projectRoot, "lib", "main.dart"),
            path.join(projectRoot, "bin", "main.dart"),
        ];
        for (const launchPath of commonLaunchPaths) {
            if (fs.existsSync(launchPath)) {
                log_1.log(`Using found common entry point: ${openFile}`);
                return launchPath;
            }
        }
    }
    getObservatoryUri(observatoryUri, defaultValue) {
        return __awaiter(this, void 0, void 0, function* () {
            observatoryUri = observatoryUri || (yield vs.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: "Paste an Observatory URI or port",
                prompt: "Enter Observatory URI",
                validateInput: (input) => {
                    if (!input)
                        return;
                    input = input.trim();
                    if (Number.isInteger(parseFloat(input)))
                        return;
                    // Uri.parse doesn't seem to work as expected, so do our own basic validation
                    // https://github.com/Microsoft/vscode/issues/49818
                    if (!input.startsWith("http://") && !input.startsWith("https://"))
                        return "Please enter a valid Observatory URI or port number";
                },
                value: defaultValue,
            }));
            observatoryUri = observatoryUri && observatoryUri.trim();
            // If the input is just a number, treat is as a localhost port.
            if (observatoryUri && /^[0-9]+$/.exec(observatoryUri)) {
                observatoryUri = `http://127.0.0.1:${observatoryUri}`;
            }
            return observatoryUri;
        });
    }
    getDebugServer(debugType, port) {
        switch (debugType) {
            case DebuggerType.Flutter:
                return this.spawnOrGetServer("flutter", port, () => new flutter_debug_impl_1.FlutterDebugSession());
            case DebuggerType.FlutterTest:
                return this.spawnOrGetServer("flutterTest", port, () => new flutter_test_debug_impl_1.FlutterTestDebugSession());
            case DebuggerType.Dart:
                return this.spawnOrGetServer("dart", port, () => new dart_debug_impl_1.DartDebugSession());
            case DebuggerType.PubTest:
                return this.spawnOrGetServer("pubTest", port, () => new dart_test_debug_impl_1.DartTestDebugSession());
            default:
                throw new Error("Unknown debugger type");
        }
    }
    spawnOrGetServer(type, port = 0, create) {
        // Start port listener on launch of first debug session.
        if (!this.debugServers[type]) {
            log_1.log(`Spawning a new ${type} debugger`);
            // Start listening on a random port.
            this.debugServers[type] = net.createServer((socket) => {
                const session = create();
                session.setRunAsServer(true);
                session.start(socket, socket);
            }).listen(port);
        }
        return this.debugServers[type];
    }
    setupDebugConfig(folder, debugConfig, isFlutter, deviceId) {
        const conf = config_1.config.for(folder && folder.uri || null);
        // Attach any properties that weren't explicitly set.
        debugConfig.name = debugConfig.name || "Dart & Flutter";
        debugConfig.type = debugConfig.type || "dart";
        debugConfig.request = debugConfig.request || "launch";
        debugConfig.cwd = debugConfig.cwd || (folder && utils_3.fsPath(folder.uri));
        debugConfig.args = debugConfig.args || [];
        debugConfig.vmAdditionalArgs = debugConfig.vmAdditionalArgs || conf.vmAdditionalArgs;
        debugConfig.dartPath = debugConfig.dartPath || path.join(this.sdks.dart, utils_2.dartVMPath);
        debugConfig.observatoryLogFile = debugConfig.observatoryLogFile || conf.observatoryLogFile;
        debugConfig.maxLogLineLength = debugConfig.maxLogLineLength || config_1.config.maxLogLineLength;
        debugConfig.pubPath = debugConfig.pubPath || path.join(this.sdks.dart, utils_2.pubPath);
        debugConfig.pubSnapshotPath = debugConfig.pubSnapshotPath || path.join(this.sdks.dart, utils_2.pubSnapshotPath);
        debugConfig.pubTestLogFile = debugConfig.pubTestLogFile || conf.pubTestLogFile;
        debugConfig.debugSdkLibraries = debugConfig.debugSdkLibraries || conf.debugSdkLibraries;
        debugConfig.debugExternalLibraries = debugConfig.debugExternalLibraries || conf.debugExternalLibraries;
        debugConfig.evaluateGettersInDebugViews = debugConfig.evaluateGettersInDebugViews || conf.evaluateGettersInDebugViews;
        debugConfig.flutterTrackWidgetCreation =
            // Use from the launch.json if configured.
            debugConfig.flutterTrackWidgetCreation !== undefined
                ? debugConfig.flutterTrackWidgetCreation :
                // Otherwise use the config, falling back to the version-dependant default.
                conf.flutterTrackWidgetCreationIsConfiguredExplicitly
                    ? conf.flutterTrackWidgetCreation
                    : this.flutterCapabilities.trackWidgetCreationDefault;
        if (isFlutter) {
            debugConfig.flutterMode = debugConfig.flutterMode || "debug";
            debugConfig.flutterPath = debugConfig.flutterPath || (this.sdks.flutter ? path.join(this.sdks.flutter, utils_2.flutterPath) : null);
            debugConfig.flutterRunLogFile = debugConfig.flutterRunLogFile || conf.flutterRunLogFile;
            debugConfig.flutterTestLogFile = debugConfig.flutterTestLogFile || conf.flutterTestLogFile;
            debugConfig.deviceId = debugConfig.deviceId || deviceId;
            debugConfig.showMemoryUsage =
                debugConfig.showMemoryUsage !== undefined && debugConfig.showMemoryUsage !== null
                    ? debugConfig.showMemoryUsage
                    : debugConfig.flutterMode === "profile";
        }
    }
    dispose() {
        if (this.debugServers) {
            for (const type of Object.keys(this.debugServers)) {
                this.debugServers[type].close();
                delete this.debugServers[type];
            }
        }
    }
}
exports.DebugConfigProvider = DebugConfigProvider;
var DebuggerType;
(function (DebuggerType) {
    DebuggerType[DebuggerType["Dart"] = 0] = "Dart";
    DebuggerType[DebuggerType["PubTest"] = 1] = "PubTest";
    DebuggerType[DebuggerType["Flutter"] = 2] = "Flutter";
    DebuggerType[DebuggerType["FlutterTest"] = 3] = "FlutterTest";
})(DebuggerType || (DebuggerType = {}));
//# sourceMappingURL=debug_config_provider.js.map