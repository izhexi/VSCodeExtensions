"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_service_1 = require("../services/stdio_service");
const utils_1 = require("./utils");
class FlutterRun extends stdio_service_1.StdIOService {
    constructor(mode, flutterBinPath, projectFolder, args, envOverrides, logFile, logger, maxLogLineLength) {
        super(() => logFile, logger, maxLogLineLength, true, true);
        this.mode = mode;
        this.unhandledMessageSubscriptions = [];
        // Subscription lists.
        this.daemonConnectedSubscriptions = [];
        this.appStartSubscriptions = [];
        this.appDebugPortSubscriptions = [];
        this.appStartedSubscriptions = [];
        this.appStopSubscriptions = [];
        this.appProgressSubscriptions = [];
        this.errorSubscriptions = [];
        const command = mode === RunMode.Attach ? "attach" : "run";
        this.createProcess(projectFolder, flutterBinPath, utils_1.globalFlutterArgs.concat([command, "--machine"]).concat(args), envOverrides);
    }
    shouldHandleMessage(message) {
        // Everything in flutter is wrapped in [] so we can tell what to handle.
        return message.startsWith("[") && message.endsWith("]");
    }
    processUnhandledMessage(message) {
        this.notify(this.unhandledMessageSubscriptions, message);
    }
    registerForUnhandledMessages(subscriber) {
        return this.subscribe(this.unhandledMessageSubscriptions, subscriber);
    }
    // TODO: Can we code-gen all this like the analysis server?
    handleNotification(evt) {
        // Always send errors up, no matter where they're from.
        if (evt.params.error) {
            this.notify(this.errorSubscriptions, evt.params.error);
        }
        switch (evt.event) {
            case "daemon.connected":
                this.notify(this.daemonConnectedSubscriptions, evt.params);
                break;
            case "app.start":
                this.notify(this.appStartSubscriptions, evt.params);
                break;
            case "app.debugPort":
                this.notify(this.appDebugPortSubscriptions, evt.params);
                break;
            case "app.started":
                this.notify(this.appStartedSubscriptions, evt.params);
                break;
            case "app.stop":
                this.notify(this.appStopSubscriptions, evt.params);
                break;
            case "app.progress":
                this.notify(this.appProgressSubscriptions, evt.params);
                break;
        }
    }
    // Request methods.
    restart(appId, pause, hotRestart, reason) {
        return this.sendRequest("app.restart", { appId, fullRestart: hotRestart === true, pause, reason });
    }
    detach(appId) {
        return this.sendRequest("app.detach", { appId });
    }
    stop(appId) {
        return this.sendRequest("app.stop", { appId });
    }
    callServiceExtension(appId, methodName, params) {
        return this.sendRequest("app.callServiceExtension", { appId, methodName, params });
    }
    // Subscription methods.
    registerForDaemonConnect(subscriber) {
        return this.subscribe(this.daemonConnectedSubscriptions, subscriber);
    }
    registerForAppStart(subscriber) {
        return this.subscribe(this.appStartSubscriptions, subscriber);
    }
    registerForAppDebugPort(subscriber) {
        return this.subscribe(this.appDebugPortSubscriptions, subscriber);
    }
    registerForAppStarted(subscriber) {
        return this.subscribe(this.appStartedSubscriptions, subscriber);
    }
    registerForAppStop(subscriber) {
        return this.subscribe(this.appStopSubscriptions, subscriber);
    }
    registerForAppProgress(subscriber) {
        return this.subscribe(this.appProgressSubscriptions, subscriber);
    }
    registerForError(subscriber) {
        return this.subscribe(this.errorSubscriptions, subscriber);
    }
}
exports.FlutterRun = FlutterRun;
var RunMode;
(function (RunMode) {
    RunMode[RunMode["Run"] = 0] = "Run";
    RunMode[RunMode["Attach"] = 1] = "Attach";
})(RunMode = exports.RunMode || (exports.RunMode = {}));
//# sourceMappingURL=flutter_run.js.map