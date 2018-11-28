"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_debugadapter_1 = require("vscode-debugadapter");
const dart_debug_impl_1 = require("./dart_debug_impl");
const dart_debug_protocol_1 = require("./dart_debug_protocol");
const test_runner_1 = require("./test_runner");
const utils_1 = require("./utils");
const tick = "✓";
const cross = "✖";
class DartTestDebugSession extends dart_debug_impl_1.DartDebugSession {
    constructor() {
        super();
        this.suitePaths = [];
        this.tests = [];
        this.sendStdOutToConsole = false;
        this.requiresProgram = false;
    }
    spawnProcess(args) {
        const debug = !args.noDebug;
        let appArgs = [];
        // To use the test framework in the supported debugging way we should
        // send this flag; which will pause the tests at each suite start (this is
        // deifferent to the isolates being paused). To do that, we need to change
        // how our "unpause" logic works in the base debug adapter (since it won't
        // be paused at startup).
        // if (debug) {
        // 	appArgs.push("--pause-after-load");
        // }
        // Instead, we do it the VM way for now...
        if (debug) {
            appArgs.push("--enable-vm-service=0");
            appArgs.push("--pause_isolates_on_start=true");
        }
        if (args.vmAdditionalArgs) {
            appArgs = appArgs.concat(args.vmAdditionalArgs);
        }
        appArgs.push(args.pubSnapshotPath);
        appArgs = appArgs.concat(["run", "test", "-r", "json"]);
        appArgs.push("-j1"); // Only run single-threaded in the runner.
        if (args.program)
            appArgs.push(this.sourceFileForArgs(args));
        if (args.args) {
            appArgs = appArgs.concat(args.args);
        }
        const logger = (message, severity) => this.sendEvent(new vscode_debugadapter_1.Event("dart.log", new utils_1.LogMessage(message, severity, utils_1.LogCategory.PubTest)));
        return this.createRunner(args.dartPath, args.cwd, args.program, appArgs, args.env, args.pubTestLogFile, logger, args.maxLogLineLength);
    }
    createRunner(executable, projectFolder, program, args, envOverrides, logFile, logger, maxLogLineLength) {
        const runner = new test_runner_1.TestRunner(executable, projectFolder, args, envOverrides, logFile, logger, maxLogLineLength);
        // Set up subscriptions.
        // this.flutter.registerForUnhandledMessages((msg) => this.log(msg));
        runner.registerForUnhandledMessages((msg) => this.logToUserIfAppropriate(msg, "stdout"));
        runner.registerForTestStartedProcess((n) => this.initObservatory(`${n.observatoryUri}ws`));
        runner.registerForAllTestNotifications((n) => {
            try {
                this.handleTestEvent(n);
            }
            catch (e) {
                this.log(e);
                this.logToUser(e);
            }
            try {
                this.sendTestEventToEditor(n);
            }
            catch (e) {
                this.log(e);
                this.logToUser(e);
            }
        });
        return runner.process;
    }
    logToUserIfAppropriate(message, category) {
        // Filter out these messages taht come to stdout that we don't want to send to the user.
        if (message && message.startsWith("Observatory listening on"))
            return;
        if (message && message.startsWith("Press Control-C again"))
            return;
        this.logToUser(message, category);
    }
    handleTestEvent(notification) {
        // Handle basic output
        switch (notification.type) {
            case "start":
                const pid = notification.pid;
                if (pid) {
                    this.additionalPidsToTerminate.push(pid);
                }
                break;
            case "debug":
                const observatoryUri = notification.observatory;
                if (observatoryUri) {
                    const match = dart_debug_protocol_1.ObservatoryConnection.httpLinkRegex.exec(observatoryUri);
                    if (match) {
                        this.initObservatory(this.websocketUriForObservatoryUri(match[1]));
                    }
                }
                break;
            case "suite":
                const suite = notification;
                // HACK: If we got a relative path, fix it up.
                if (!path.isAbsolute(suite.suite.path) && this.cwd)
                    suite.suite.path = path.join(this.cwd, suite.suite.path);
                this.suitePaths[suite.suite.id] = suite.suite.path;
                break;
            case "testStart":
                const testStart = notification;
                this.tests[testStart.test.id] = testStart.test;
                break;
            case "testDone":
                const testDone = notification;
                if (testDone.hidden)
                    return;
                const pass = testDone.result === "success";
                const symbol = pass ? tick : cross;
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${symbol} ${this.tests[testDone.testID].name}\n`, "stdout"));
                break;
            case "print":
                const print = notification;
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${print.message}\n`, "stdout"));
                break;
            case "error":
                const error = notification;
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${error.error}\n`, "stderr"));
                this.sendEvent(new vscode_debugadapter_1.OutputEvent(`${error.stackTrace}\n`, "stderr"));
                break;
        }
    }
    sendTestEventToEditor(notification) {
        let suiteID;
        switch (notification.type) {
            case "suite":
                const suite = notification;
                suiteID = suite.suite.id;
                break;
            case "group":
                const group = notification;
                suiteID = group.group.suiteID;
                break;
            case "testStart":
                const testStart = notification;
                suiteID = testStart.test.suiteID;
                break;
            case "testDone":
                const testDone = notification;
                suiteID = this.tests[testDone.testID].suiteID;
                break;
            case "print":
                const print = notification;
                suiteID = this.tests[print.testID].suiteID;
                break;
            case "error":
                const error = notification;
                suiteID = this.tests[error.testID].suiteID;
                break;
        }
        const suitePath = this.suitePaths[suiteID];
        if (suitePath) {
            this.sendEvent(new vscode_debugadapter_1.Event("dart.testRunNotification", { suitePath, notification }));
        }
    }
}
exports.DartTestDebugSession = DartTestDebugSession;
//# sourceMappingURL=dart_test_debug_impl.js.map