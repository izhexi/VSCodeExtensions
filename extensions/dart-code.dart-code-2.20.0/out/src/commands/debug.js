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
const utils_1 = require("../debug/utils");
const extension_1 = require("../extension");
const debug_config_provider_1 = require("../providers/debug_config_provider");
const utils_2 = require("../utils");
const log_1 = require("../utils/log");
exports.IS_INSPECTING_WIDGET_CONTEXT = "dart-code:flutter.isInspectingWidget";
let debugPaintingEnabled = false;
let performanceOverlayEnabled = false;
let repaintRainbowEnabled = false;
let timeDilation = 1.0;
let debugModeBannerEnabled = true;
let paintBaselinesEnabled = false;
let widgetInspectorEnabled = false;
const debugSessions = [];
// export let mostRecentAttachedProbablyReusableObservatoryUri: string;
class LastDebugSession {
}
LastDebugSession.workspaceFolder = null;
LastDebugSession.debugConfig = null;
exports.LastDebugSession = LastDebugSession;
class DebugCommands {
    constructor(context, analytics) {
        this.debugMetrics = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 0);
        this.onWillHotReloadEmitter = new vs.EventEmitter();
        this.onWillHotReload = this.onWillHotReloadEmitter.event;
        this.onWillHotRestartEmitter = new vs.EventEmitter();
        this.onWillHotRestart = this.onWillHotRestartEmitter.event;
        this.onReceiveCoverageEmitter = new vs.EventEmitter();
        this.onReceiveCoverage = this.onReceiveCoverageEmitter.event;
        this.onFirstFrameEmitter = new vs.EventEmitter();
        this.onFirstFrame = this.onFirstFrameEmitter.event;
        this.serviceSettings = {};
        this.enabledServiceExtensions = [];
        this.analytics = analytics;
        context.subscriptions.push(this.debugMetrics);
        context.subscriptions.push(vs.debug.onDidReceiveDebugSessionCustomEvent((e) => {
            const session = debugSessions.find((ds) => ds.session === e.session);
            if (!session)
                return;
            if (e.event === "dart.progress") {
                if (e.body.message) {
                    // Clear any old progress first
                    if (session.progressPromise)
                        session.progressPromise.resolve();
                    session.progressPromise = new utils_1.PromiseCompleter();
                    vs.window.withProgress({ location: vs.ProgressLocation.Notification, title: e.body.message }, (_) => {
                        if (!session.progressPromise)
                            session.progressPromise = new utils_1.PromiseCompleter();
                        return session.progressPromise.promise;
                    });
                }
                if (e.body.finished) {
                    if (session.progressPromise) {
                        session.progressPromise.resolve();
                        session.progressPromise = undefined;
                    }
                }
            }
            else if (e.event === "dart.observatoryUri") {
                session.observatoryUri = e.body.observatoryUri;
                // if (e.body.isProbablyReconnectable) {
                // 	mostRecentAttachedProbablyReusableObservatoryUri = session.observatoryUri;
                // } else {
                // 	mostRecentAttachedProbablyReusableObservatoryUri = undefined;
                // }
            }
            else if (e.event === "dart.log") {
                log_1.handleDebugLogEvent(e.event, e.body);
            }
            else if (e.event === "dart.restartRequest") {
                // This event comes back when the user restarts with the Restart button
                // (eg. it wasn't intiated from our extension, so we don't get to log it
                // in the hotReload command).
                analytics.logDebuggerHotReload();
                this.onWillHotReloadEmitter.fire();
            }
            else if (e.event === "dart.serviceExtensionAdded") {
                this.enableServiceExtension(e.body.id);
                // If the isWidgetCreationTracked extension loads, call it to get the value.
                if (e.body.id === "ext.flutter.inspector.isWidgetCreationTracked") {
                    this.sendCustomFlutterDebugCommand(session, "checkIsWidgetCreationTracked");
                }
            }
            else if (e.event === "dart.flutter.firstFrame") {
                // Send the current value to ensure it persists for the user.
                this.sendAllServiceSettings();
                this.onFirstFrameEmitter.fire();
            }
            else if (e.event === "dart.flutter.updateIsWidgetCreationTracked") {
                vs.commands.executeCommand("setContext", debug_config_provider_1.TRACK_WIDGET_CREATION_ENABLED, e.body.isWidgetCreationTracked);
            }
            else if (e.event === "dart.debugMetrics") {
                const memory = e.body.memory;
                const message = `${Math.ceil(memory.current / 1024 / 1024)}MB of ${Math.ceil(memory.total / 1024 / 1024)}MB`;
                this.debugMetrics.text = message;
                this.debugMetrics.tooltip = "This is the amount of memory being consumed by your applications heaps (out of what has been allocated).\n\nNote: memory usage shown in debug builds may not be indicative of usage in release builds. Use profile builds for more accurate figures when testing memory usage.";
                this.debugMetrics.show();
            }
            else if (e.event === "dart.coverage") {
                this.onReceiveCoverageEmitter.fire(e.body);
            }
            else if (e.event === "dart.navigate") {
                if (e.body.file && e.body.line && e.body.column)
                    vs.commands.executeCommand("_dart.jumpToLineColInUri", vs.Uri.parse(e.body.file), e.body.line, e.body.column);
            }
        }));
        context.subscriptions.push(vs.debug.onDidStartDebugSession((s) => __awaiter(this, void 0, void 0, function* () {
            let type = s.type;
            // The Visual Studio Live Share extension overrides the type to proxy debug sessions so
            // it won't be "dart". We can request the real info from it with the debugSessionInfo
            // custom request.
            if (type === "vslsShare") {
                const debugSessionInfo = yield s.customRequest("debugSessionInfo");
                type = debugSessionInfo.configurationProperties.type;
            }
            if (type === "dart") {
                const session = new DartDebugSessionInformation(s);
                // If we're the first fresh debug session, reset all settings to default.
                // Subsequent launches will inherit the "current" values.
                if (debugSessions.length === 0)
                    this.resetFlutterSettings();
                debugSessions.push(session);
            }
        })));
        context.subscriptions.push(vs.debug.onDidTerminateDebugSession((s) => {
            const sessionIndex = debugSessions.findIndex((ds) => ds.session === s);
            if (sessionIndex === -1)
                return;
            // Grab the session and remove it from the list so we don't try to interact with it anymore.
            const session = debugSessions[sessionIndex];
            debugSessions.splice(sessionIndex, 1);
            if (session.progressPromise)
                session.progressPromise.resolve();
            this.debugMetrics.hide();
            const debugSessionEnd = new Date();
            analytics.logDebugSessionDuration(debugSessionEnd.getTime() - session.sessionStart.getTime());
            // If this was the last session terminating, then remove all the flags for which service extensions are supported.
            // Really we should track these per-session, but the changes of them being different given we only support one
            // SDK at a time are practically zero.
            if (debugSessions.length === 0)
                this.disableAllServiceExtensions();
        }));
        this.registerBoolServiceCommand("ext.flutter.debugPaint", () => debugPaintingEnabled);
        this.registerBoolServiceCommand("ext.flutter.showPerformanceOverlay", () => performanceOverlayEnabled);
        this.registerBoolServiceCommand("ext.flutter.repaintRainbow", () => repaintRainbowEnabled);
        this.registerServiceCommand("ext.flutter.timeDilation", () => ({ timeDilation }));
        this.registerBoolServiceCommand("ext.flutter.debugAllowBanner", () => debugModeBannerEnabled);
        this.registerBoolServiceCommand("ext.flutter.debugPaintBaselinesEnabled", () => paintBaselinesEnabled);
        this.registerBoolServiceCommand("ext.flutter.inspector.show", () => widgetInspectorEnabled);
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleDebugPainting", () => { debugPaintingEnabled = !debugPaintingEnabled; this.sendServiceSetting("ext.flutter.debugPaint"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.togglePerformanceOverlay", () => { performanceOverlayEnabled = !performanceOverlayEnabled; this.sendServiceSetting("ext.flutter.showPerformanceOverlay"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleRepaintRainbow", () => { repaintRainbowEnabled = !repaintRainbowEnabled; this.sendServiceSetting("ext.flutter.repaintRainbow"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleSlowAnimations", () => { timeDilation = 6.0 - timeDilation; this.sendServiceSetting("ext.flutter.timeDilation"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.toggleDebugModeBanner", () => { debugModeBannerEnabled = !debugModeBannerEnabled; this.sendServiceSetting("ext.flutter.debugAllowBanner"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.togglePaintBaselines", () => { paintBaselinesEnabled = !paintBaselinesEnabled; this.sendServiceSetting("ext.flutter.debugPaintBaselinesEnabled"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.inspectWidget", () => { widgetInspectorEnabled = true; this.sendServiceSetting("ext.flutter.inspector.show"); }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.cancelInspectWidget", () => { widgetInspectorEnabled = false; this.sendServiceSetting("ext.flutter.inspector.show"); }));
        // Open Observatory.
        context.subscriptions.push(vs.commands.registerCommand("dart.openObservatory", () => __awaiter(this, void 0, void 0, function* () {
            if (!debugSessions.length)
                return;
            const session = debugSessions.length === 1
                ? debugSessions[0]
                : yield this.promptForDebugSession();
            if (session && session.observatoryUri) {
                utils_2.openInBrowser(session.observatoryUri);
                analytics.logDebuggerOpenObservatory();
            }
        })));
        context.subscriptions.push(vs.commands.registerCommand("flutter.openTimeline", () => __awaiter(this, void 0, void 0, function* () {
            if (!debugSessions.length)
                return;
            const session = debugSessions.length === 1
                ? debugSessions[0]
                : yield this.promptForDebugSession();
            if (session && session.observatoryUri) {
                utils_2.openInBrowser(session.observatoryUri + "/#/timeline-dashboard");
                analytics.logDebuggerOpenTimeline();
            }
        })));
        // Misc custom debug commands.
        context.subscriptions.push(vs.commands.registerCommand("flutter.hotReload", (args) => {
            if (!debugSessions.length)
                return;
            this.onWillHotReloadEmitter.fire();
            debugSessions.forEach((s) => this.sendCustomFlutterDebugCommand(s, "hotReload", args));
            analytics.logDebuggerHotReload();
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.hotRestart", (args) => {
            if (!debugSessions.length)
                return;
            this.onWillHotRestartEmitter.fire();
            debugSessions.forEach((s) => this.sendCustomFlutterDebugCommand(s, "hotRestart", args));
            analytics.logDebuggerRestart();
        }));
        context.subscriptions.push(vs.commands.registerCommand("_dart.requestCoverageUpdate", (scriptUris) => {
            debugSessions.forEach((s) => this.sendCustomFlutterDebugCommand(s, "requestCoverageUpdate", { scriptUris }));
        }));
        context.subscriptions.push(vs.commands.registerCommand("_dart.coverageFilesUpdate", (scriptUris) => {
            debugSessions.forEach((s) => this.sendCustomFlutterDebugCommand(s, "coverageFilesUpdate", { scriptUris }));
        }));
        context.subscriptions.push(vs.commands.registerCommand("dart.startDebugging", (resource) => {
            vs.debug.startDebugging(vs.workspace.getWorkspaceFolder(resource), {
                name: "Dart",
                program: utils_2.fsPath(resource),
                request: "launch",
                type: "dart",
            });
        }));
        context.subscriptions.push(vs.commands.registerCommand("dart.startWithoutDebugging", (resource) => {
            vs.debug.startDebugging(vs.workspace.getWorkspaceFolder(resource), {
                name: "Dart",
                noDebug: true,
                program: utils_2.fsPath(resource),
                request: "launch",
                type: "dart",
            });
        }));
        context.subscriptions.push(vs.commands.registerCommand("dart.runAllTestsWithoutDebugging", () => {
            const testFolders = utils_2.getDartWorkspaceFolders()
                .map((project) => path.join(utils_2.fsPath(project.uri), "test"))
                .filter((testFolder) => fs.existsSync(testFolder));
            if (testFolders.length === 0) {
                vs.window.showErrorMessage("Unable to find any test folders");
                return;
            }
            for (const folder of testFolders) {
                const ws = vs.workspace.getWorkspaceFolder(vs.Uri.file(folder));
                const name = path.basename(path.dirname(folder));
                vs.debug.startDebugging(ws, {
                    cwd: path.dirname(folder),
                    name: `Dart ${name}`,
                    noDebug: true,
                    request: "launch",
                    runner: "tests",
                    type: "dart",
                });
            }
        }));
        context.subscriptions.push(vs.commands.registerCommand("dart.rerunLastDebugSession", () => {
            vs.debug.startDebugging(LastDebugSession.workspaceFolder, LastDebugSession.debugConfig);
        }));
        // Flutter toggle platform.
        // We can't just use a service command here, as we need to call it twice (once to get, once to change) and
        // currently it seems like the DA can't return responses to us here, so we'll have to do them both inside the DA.
        context.subscriptions.push(vs.commands.registerCommand("flutter.togglePlatform", () => {
            debugSessions.forEach((s) => this.sendCustomFlutterDebugCommand(s, "togglePlatform"));
        }));
        // Attach commands.
        context.subscriptions.push(vs.commands.registerCommand("dart.attach", () => {
            vs.debug.startDebugging(undefined, {
                name: "Dart: Attach to Process",
                request: "attach",
                type: "dart",
            });
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.attach", () => {
            vs.debug.startDebugging(undefined, {
                name: "Flutter: Attach to Process",
                request: "attach",
                type: "dart",
            });
        }));
    }
    promptForDebugSession() {
        return __awaiter(this, void 0, void 0, function* () {
            const selectedItem = yield vs.window.showQuickPick(debugSessions.map((s) => ({
                description: `Started ${s.sessionStart.toLocaleTimeString()}`,
                label: s.session.name,
                session: s,
            })), {
                placeHolder: "Which debug session?",
            });
            return selectedItem && selectedItem.session;
        });
    }
    sendServiceSetting(id) {
        if (this.serviceSettings[id] && this.enabledServiceExtensions.indexOf(id) !== -1) {
            this.serviceSettings[id]();
            if (id === "ext.flutter.inspector.show")
                vs.commands.executeCommand("setContext", exports.IS_INSPECTING_WIDGET_CONTEXT, widgetInspectorEnabled);
        }
    }
    sendAllServiceSettings() {
        for (const id in this.serviceSettings)
            this.sendServiceSetting(id);
    }
    registerBoolServiceCommand(id, getValue) {
        this.serviceSettings[id] = () => {
            debugSessions.forEach((s) => this.runBoolServiceCommand(s, id, getValue()));
        };
    }
    registerServiceCommand(id, getValue) {
        this.serviceSettings[id] = () => {
            debugSessions.forEach((s) => this.runServiceCommand(s, id, getValue()));
        };
    }
    runServiceCommand(session, method, params) {
        this.sendCustomFlutterDebugCommand(session, "serviceExtension", { type: method, params });
    }
    runBoolServiceCommand(session, method, enabled) {
        this.runServiceCommand(session, method, { enabled });
    }
    sendCustomFlutterDebugCommand(session, type, args) {
        session.session.customRequest(type, args);
    }
    resetFlutterSettings() {
        debugPaintingEnabled = false;
        performanceOverlayEnabled = false;
        repaintRainbowEnabled = false;
        timeDilation = 1.0;
        debugModeBannerEnabled = true;
        paintBaselinesEnabled = false;
        widgetInspectorEnabled = false;
    }
    enableServiceExtension(id) {
        this.enabledServiceExtensions.push(id);
        vs.commands.executeCommand("setContext", `${extension_1.SERVICE_EXTENSION_CONTEXT_PREFIX}${id}`, true);
    }
    disableAllServiceExtensions() {
        for (const id of this.enabledServiceExtensions) {
            vs.commands.executeCommand("setContext", `${extension_1.SERVICE_EXTENSION_CONTEXT_PREFIX}${id}`, undefined);
        }
        this.enabledServiceExtensions.length = 0;
        vs.commands.executeCommand("setContext", debug_config_provider_1.TRACK_WIDGET_CREATION_ENABLED, false);
    }
}
exports.DebugCommands = DebugCommands;
class DartDebugSessionInformation {
    constructor(session) {
        this.session = session;
        this.sessionStart = new Date();
    }
}
//# sourceMappingURL=debug.js.map