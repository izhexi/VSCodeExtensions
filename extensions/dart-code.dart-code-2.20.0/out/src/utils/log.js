"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const _ = require("lodash");
const os = require("os");
const path = require("path");
const vs = require("vscode");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../debug/utils");
const utils_2 = require("../utils");
let extensionLogPath;
function getExtensionLogPath() {
    extensionLogPath = extensionLogPath || config_1.config.extensionLogFile || path.join(os.tmpdir(), `dart-code-startup-log-${utils_2.getRandomInt(0x1000, 0x10000).toString(16)}.txt`);
    return extensionLogPath;
}
exports.getExtensionLogPath = getExtensionLogPath;
exports.userSelectableLogCategories = {
    "Analysis Server": utils_1.LogCategory.Analyzer,
    "Debugger (Observatory)": utils_1.LogCategory.Observatory,
    "Flutter Device Daemon": utils_1.LogCategory.FlutterDaemon,
    "Flutter Run": utils_1.LogCategory.FlutterRun,
    "Flutter Test": utils_1.LogCategory.FlutterTest,
    "Pub Run Test": utils_1.LogCategory.PubTest,
};
const onLogEmitter = new vscode_1.EventEmitter();
exports.onLog = onLogEmitter.event;
function log(message, severity = utils_1.LogSeverity.Info, category = utils_1.LogCategory.General) {
    onLogEmitter.fire(new utils_1.LogMessage((message || "").toString(), severity, category));
    // Warn/Error always go to General.
    if (category !== utils_1.LogCategory.General && severity !== utils_1.LogSeverity.Info) {
        onLogEmitter.fire(new utils_1.LogMessage(`[${utils_1.LogCategory[category]}] ${message}`, severity, utils_1.LogCategory.General));
    }
}
exports.log = log;
function logError(error, category = utils_1.LogCategory.General) {
    if (!error)
        error = "Empty error";
    if (error instanceof Error)
        error = error.message + (error.stack ? `\n${error.stack}` : "");
    if (typeof error !== "string") {
        try {
            error = JSON.stringify(error);
        }
        catch (_a) {
            if (error.message)
                error = error.message;
            else
                error = `${error}`;
        }
    }
    if (utils_2.isDevExtension)
        vs.window.showErrorMessage("DEBUG: " + error);
    console.error(error);
    log(error, utils_1.LogSeverity.Error, category);
}
exports.logError = logError;
function logWarn(warning, category = utils_1.LogCategory.General) {
    if (utils_2.isDevExtension)
        vs.window.showWarningMessage("DEBUG: " + warning);
    console.warn(warning);
    log(`WARN: ${warning}`, utils_1.LogSeverity.Warn, category);
}
exports.logWarn = logWarn;
function logInfo(info) {
    console.log(info);
    log(info, utils_1.LogSeverity.Info, utils_1.LogCategory.General);
}
exports.logInfo = logInfo;
function handleDebugLogEvent(event, message) {
    if (event)
        log(message.message, message.severity, message.category);
    else
        logWarn(`Failed to handle log event ${JSON.stringify(message)}`);
}
exports.handleDebugLogEvent = handleDebugLogEvent;
const logHeader = [];
function clearLogHeader() {
    logHeader.length = 0;
}
exports.clearLogHeader = clearLogHeader;
function getLogHeader() {
    if (!logHeader.length)
        return "";
    return logHeader.join(utils_1.platformEol) + utils_1.platformEol + utils_1.platformEol;
}
exports.getLogHeader = getLogHeader;
function addToLogHeader(f) {
    try {
        logHeader.push(f().replace("\r", "").replace("\n", "\r\n"));
    }
    catch (_a) {
        // Don't log here; we may be trying to access things that aren't available yet.
    }
}
exports.addToLogHeader = addToLogHeader;
function logTo(file, logCategories) {
    if (!file || !path.isAbsolute(file))
        throw new Error("Path passed to logTo must be an absolute path");
    const time = () => `[${(new Date()).toTimeString()}] `;
    let logStream = fs.createWriteStream(file);
    logStream.write(getLogHeader());
    logStream.write(`${(new Date()).toDateString()} ${time()}Log file started${utils_1.platformEol}`);
    let logger = exports.onLog((e) => {
        if (logCategories && logCategories.indexOf(e.category) === -1)
            return;
        if (!logStream)
            return;
        const message = _.trimEnd(e.message);
        const maxLogLineLength = config_1.config.maxLogLineLength;
        const logMessage = maxLogLineLength && message.length > maxLogLineLength
            ? message.substring(0, maxLogLineLength) + "…"
            : message;
        const prefix = `${time()}[${utils_1.LogCategory[e.category]}] [${utils_1.LogSeverity[e.severity]}] `;
        logStream.write(`${prefix}${logMessage}${utils_1.platformEol}`);
    });
    return {
        dispose() {
            if (logger) {
                logger.dispose();
                logger = undefined;
            }
            return new Promise((resolve) => {
                if (logStream) {
                    logStream.write(`${(new Date()).toDateString()} ${time()}Log file ended${utils_1.platformEol}`);
                    logStream.end(resolve);
                    logStream = undefined;
                }
            });
        },
    };
}
exports.logTo = logTo;
//# sourceMappingURL=log.js.map