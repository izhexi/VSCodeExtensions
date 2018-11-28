"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_debugadapter_1 = require("vscode-debugadapter");
const dart_test_debug_impl_1 = require("./dart_test_debug_impl");
const utils_1 = require("./utils");
class FlutterTestDebugSession extends dart_test_debug_impl_1.DartTestDebugSession {
    spawnProcess(args) {
        const debug = !args.noDebug;
        let appArgs = [];
        if (debug) {
            appArgs.push("--start-paused");
        }
        if (args.args) {
            appArgs = appArgs.concat(args.args);
        }
        if (args.program)
            appArgs.push(this.sourceFileForArgs(args));
        const logger = (message, severity) => this.sendEvent(new vscode_debugadapter_1.Event("dart.log", new utils_1.LogMessage(message, severity, utils_1.LogCategory.FlutterTest)));
        return this.createRunner(args.flutterPath, args.cwd, args.program, utils_1.globalFlutterArgs.concat(["test", "--machine"]).concat(appArgs), args.env, args.flutterTestLogFile, logger, args.maxLogLineLength);
    }
}
exports.FlutterTestDebugSession = FlutterTestDebugSession;
//# sourceMappingURL=flutter_test_debug_impl.js.map