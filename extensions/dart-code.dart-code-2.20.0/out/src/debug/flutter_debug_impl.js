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
const vscode_debugadapter_1 = require("vscode-debugadapter");
const constants_1 = require("../constants");
const dart_debug_impl_1 = require("./dart_debug_impl");
const flutter_run_1 = require("./flutter_run");
const utils_1 = require("./utils");
const objectGroupName = "my-group";
class FlutterDebugSession extends dart_debug_impl_1.DartDebugSession {
    constructor() {
        super();
        this.appHasStarted = false;
        this.noDebug = false;
        this.isReloadInProgress = false;
        this.sendStdOutToConsole = false;
        // We get the Observatory URI from the `flutter run` process. If we parse
        // it out of verbose logging and connect to it, it'll be before Flutter is
        // finished setting up and bad things can happen (like us sending events
        // way too early).
        this.parseObservatoryUriFromStdOut = false;
        this.requiresProgram = false;
    }
    initializeRequest(response, args) {
        response.body.supportsRestartRequest = true;
        super.initializeRequest(response, args);
    }
    attachRequest(response, args) {
        return __awaiter(this, void 0, void 0, function* () {
            // For flutter attach, we actually do the same thing as launch - we run a flutter process
            // (flutter attach instead of flutter run).
            // this.observatoryUriIsProbablyReconnectable = true;
            this.launchRequest(response, args);
        });
    }
    spawnProcess(args) {
        this.noDebug = args.noDebug;
        const debug = !args.noDebug;
        const isAttach = args.request === "attach";
        let appArgs = [];
        if (!isAttach) {
            appArgs.push("-t");
            appArgs.push(this.sourceFileForArgs(args));
        }
        if (args.deviceId) {
            appArgs.push("-d");
            appArgs.push(args.deviceId);
        }
        if (isAttach) {
            // TODO: We need to handle just port numbers here, and also validation.
            // https://github.com/Dart-Code/Dart-Code/issues/1190
            const flutterAttach = args;
            if (flutterAttach.observatoryUri) {
                const observatoryPort = /:([0-9]+)\/?$/.exec(flutterAttach.observatoryUri)[1];
                appArgs.push("--debug-port");
                appArgs.push(observatoryPort);
            }
        }
        if (!isAttach) {
            if (args.flutterMode === "profile") {
                appArgs.push("--profile");
            }
            else if (args.flutterMode === "release") {
                appArgs.push("--release");
            }
            if (debug) {
                appArgs.push("--start-paused");
            }
            if (this.flutterTrackWidgetCreation) {
                appArgs.push("--track-widget-creation");
            }
        }
        if (args.args) {
            appArgs = appArgs.concat(args.args);
        }
        if (args.showMemoryUsage) {
            this.pollforMemoryMs = 1000;
        }
        // Normally for `flutter run` we don't allow terminating the pid we get from Observatory,
        // because it's on a remote device, however in the case of the flutter-tester, it is local
        // and otherwise might be left hanging around.
        // Unless, of course, we attached in which case we expect to detach by default.
        this.allowTerminatingObservatoryVmPid = args.deviceId === "flutter-tester" && !isAttach;
        const logger = (message, severity) => this.sendEvent(new vscode_debugadapter_1.Event("dart.log", new utils_1.LogMessage(message, severity, utils_1.LogCategory.FlutterRun)));
        this.flutter = new flutter_run_1.FlutterRun(isAttach ? flutter_run_1.RunMode.Attach : flutter_run_1.RunMode.Run, args.flutterPath, args.cwd, appArgs, args.env, args.flutterRunLogFile, logger, this.maxLogLineLength);
        this.flutter.registerForUnhandledMessages((msg) => {
            // Send a dummy progress message when we get the waiting message for an Attach.
            if (msg && msg.indexOf("Waiting for a connection from Flutter on") !== -1 && !this.currentRunningAppId && !this.appHasStarted)
                this.sendEvent(new vscode_debugadapter_1.Event("dart.progress", { message: msg, finished: false }));
            this.logToUser(msg, "stdout");
        });
        // Set up subscriptions.
        this.flutter.registerForDaemonConnect((n) => this.additionalPidsToTerminate.push(n.pid));
        this.flutter.registerForAppStart((n) => this.currentRunningAppId = n.appId);
        this.flutter.registerForAppDebugPort((n) => {
            this.observatoryUri = n.wsUri;
            this.connectToObservatoryIfReady();
        });
        this.flutter.registerForAppStarted((n) => {
            this.appHasStarted = true;
            this.connectToObservatoryIfReady();
        });
        this.flutter.registerForAppStop((n) => { this.currentRunningAppId = undefined; this.flutter.dispose(); });
        this.flutter.registerForAppProgress((e) => this.sendEvent(new vscode_debugadapter_1.Event("dart.progress", { message: e.message, finished: e.finished })));
        this.flutter.registerForError((err) => this.sendEvent(new vscode_debugadapter_1.OutputEvent(err, "stderr")));
        return this.flutter.process;
    }
    connectToObservatoryIfReady() {
        if (!this.noDebug && this.observatoryUri && this.appHasStarted && !this.observatory)
            this.initObservatory(this.observatoryUri);
    }
    terminate(force) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.currentRunningAppId && this.appHasStarted) {
                    const quitMethod = this.flutter.mode === flutter_run_1.RunMode.Run
                        ? () => this.flutter.stop(this.currentRunningAppId)
                        : () => this.flutter.detach(this.currentRunningAppId);
                    // Wait up to 1000ms for app to quit since we often don't get a
                    // response here because the processes terminate immediately.
                    yield Promise.race([
                        quitMethod(),
                        new Promise((resolve) => setTimeout(resolve, 1000)),
                    ]);
                }
            }
            catch (_a) {
                // Ignore failures here (we're shutting down and will send kill signals).
            }
            _super("terminate").call(this, force);
        });
    }
    restartRequest(response, args) {
        this.sendEvent(new vscode_debugadapter_1.Event("dart.restartRequest"));
        this.performReload(false, constants_1.restartReasonManual);
        // Notify the Extension we had a restart request so it's able to
        // log the hotReload.
        super.restartRequest(response, args);
    }
    performReload(hotRestart, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.appHasStarted)
                return;
            if (this.isReloadInProgress) {
                this.sendEvent(new vscode_debugadapter_1.OutputEvent("Reload already in progress, ignoring request", "stderr"));
                return;
            }
            this.isReloadInProgress = true;
            try {
                yield this.flutter.restart(this.currentRunningAppId, !this.noDebug, hotRestart, reason);
                this.requestCoverageUpdate(hotRestart ? "hot-restart" : "hot-reload");
            }
            catch (e) {
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(e, "stderr"));
            }
            finally {
                this.isReloadInProgress = false;
            }
        });
    }
    customRequest(request, response, args) {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            try {
                switch (request) {
                    case "serviceExtension":
                        if (this.currentRunningAppId)
                            yield this.flutter.callServiceExtension(this.currentRunningAppId, args.type, args.params);
                        this.sendResponse(response);
                        break;
                    case "togglePlatform":
                        if (this.currentRunningAppId) {
                            const result = yield this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.platformOverride", null);
                            yield this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.platformOverride", { value: result.value === "android" ? "iOS" : "android" });
                        }
                        this.sendResponse(response);
                        break;
                    case "checkIsWidgetCreationTracked":
                        if (this.currentRunningAppId) {
                            const result = yield this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.inspector.isWidgetCreationTracked", null);
                            this.sendEvent(new vscode_debugadapter_1.Event("dart.flutter.updateIsWidgetCreationTracked", { isWidgetCreationTracked: result.result }));
                        }
                        this.sendResponse(response);
                        break;
                    case "hotReload":
                        if (this.currentRunningAppId)
                            yield this.performReload(false, args && args.reason || constants_1.restartReasonManual);
                        this.sendResponse(response);
                        break;
                    case "hotRestart":
                        if (this.currentRunningAppId)
                            yield this.performReload(true, args && args.reason || constants_1.restartReasonManual);
                        this.sendResponse(response);
                        break;
                    default:
                        _super("customRequest").call(this, request, response, args);
                        break;
                }
            }
            catch (e) {
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(e, "stderr"));
            }
        });
    }
    // TODO: Remove this function (and the call to it) once the fix has rolled to Flutter beta.
    // https://github.com/flutter/flutter-intellij/issues/2217
    formatPathForPubRootDirectories(path) {
        return utils_1.isWin
            ? path && `file:///${path.replace(/\\/g, "/")}`
            : path;
    }
    handleInspectEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Move to only do this at the start of the session (only if required)
            // TODO: We should send all open workspaces (arg0, arg1, arg2) so that it
            // works for open packages too
            yield this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.inspector.setPubRootDirectories", {
                arg0: this.formatPathForPubRootDirectories(this.cwd),
                arg1: this.cwd,
                // TODO: Is this OK???
                isolateId: this.threadManager.threads[0].ref.id,
            });
            const selectedWidget = yield this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.inspector.getSelectedSummaryWidget", { previousSelectionId: null, objectGroup: objectGroupName });
            if (selectedWidget && selectedWidget.result && selectedWidget.result.creationLocation) {
                const loc = selectedWidget.result.creationLocation;
                const file = loc.file;
                const line = loc.line;
                const column = loc.column;
                this.sendEvent(new vscode_debugadapter_1.Event("dart.navigate", { file, line, column }));
            }
            // console.log(JSON.stringify(selectedWidget));
            yield this.flutter.callServiceExtension(this.currentRunningAppId, "ext.flutter.inspector.disposeGroup", { objectGroup: objectGroupName });
            // TODO: How can we translate this back to source?
            // const evt = event as any;
            // const thread: VMIsolateRef = evt.isolate;
            // const inspectee = (event as any).inspectee;
        });
    }
    // Extension
    handleExtensionEvent(event) {
        if (event.kind === "Extension" && event.extensionKind === "Flutter.FirstFrame") {
            this.sendEvent(new vscode_debugadapter_1.Event("dart.flutter.firstFrame", {}));
        }
        else if (event.kind === "Extension" && event.extensionKind === "Flutter.Frame") {
            this.requestCoverageUpdate("frame");
        }
        else {
            super.handleExtensionEvent(event);
        }
    }
}
exports.FlutterDebugSession = FlutterDebugSession;
//# sourceMappingURL=flutter_debug_impl.js.map