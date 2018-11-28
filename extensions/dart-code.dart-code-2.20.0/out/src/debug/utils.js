"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
exports.dartCodeExtensionIdentifier = "Dart-Code.dart-code";
exports.flutterExtensionIdentifier = "Dart-Code.flutter";
exports.isWin = /^win/.test(process.platform);
exports.isMac = process.platform === "darwin";
exports.isLinux = !exports.isWin && !exports.isMac;
exports.platformName = exports.isWin ? "win" : exports.isMac ? "mac" : "linux";
exports.platformEol = exports.isWin ? "\r\n" : "\n";
var LogCategory;
(function (LogCategory) {
    LogCategory[LogCategory["General"] = 0] = "General";
    LogCategory[LogCategory["CI"] = 1] = "CI";
    LogCategory[LogCategory["Analyzer"] = 2] = "Analyzer";
    LogCategory[LogCategory["PubTest"] = 3] = "PubTest";
    LogCategory[LogCategory["FlutterDaemon"] = 4] = "FlutterDaemon";
    LogCategory[LogCategory["FlutterRun"] = 5] = "FlutterRun";
    LogCategory[LogCategory["FlutterTest"] = 6] = "FlutterTest";
    LogCategory[LogCategory["Observatory"] = 7] = "Observatory";
})(LogCategory = exports.LogCategory || (exports.LogCategory = {}));
var LogSeverity;
(function (LogSeverity) {
    LogSeverity[LogSeverity["Info"] = 0] = "Info";
    LogSeverity[LogSeverity["Warn"] = 1] = "Warn";
    LogSeverity[LogSeverity["Error"] = 2] = "Error";
})(LogSeverity = exports.LogSeverity || (exports.LogSeverity = {}));
class LogMessage {
    constructor(message, severity, category) {
        this.message = message;
        this.severity = severity;
        this.category = category;
    }
}
exports.LogMessage = LogMessage;
exports.toolEnv = Object.create(process.env);
exports.toolEnv.FLUTTER_HOST = "VSCode";
exports.toolEnv.PUB_ENVIRONMENT = (exports.toolEnv.PUB_ENVIRONMENT ? `${exports.toolEnv.PUB_ENVIRONMENT}:` : "") + "vscode.dart-code";
exports.globalFlutterArgs = [];
if (process.env.DART_CODE_IS_TEST_RUN) {
    exports.toolEnv.PUB_ENVIRONMENT += ".test.bot";
    exports.globalFlutterArgs.push("--suppress-analytics");
}
function safeSpawn(workingDirectory, binPath, args, envOverrides) {
    // Spawning processes on Windows with funny symbols in the path requires quoting. However if you quote an
    // executable with a space in its path and an argument also has a space, you have to then quote all of the
    // arguments too!\
    // https://github.com/nodejs/node/issues/7367
    const customEnv = envOverrides
        ? Object.assign(Object.create(exports.toolEnv), envOverrides) // Do it this way so we can override toolEnv if required.
        : exports.toolEnv;
    return child_process.spawn(`"${binPath}"`, args.map((a) => `"${a}"`), { cwd: workingDirectory, env: customEnv, shell: true });
}
exports.safeSpawn = safeSpawn;
function uriToFilePath(uri, returnWindowsPath = exports.isWin) {
    let filePath = uri;
    if (uri.startsWith("file://"))
        filePath = decodeURI(uri.substring(7));
    else if (uri.startsWith("file:"))
        filePath = decodeURI(uri.substring(5)); // TODO: Does this case ever get hit? Will it be over-decoded?
    // Windows fixup.
    if (returnWindowsPath) {
        filePath = filePath.replace(/\//g, "\\");
        if (filePath[0] === "\\")
            filePath = filePath.substring(1);
    }
    else {
        if (filePath[0] !== "/")
            filePath = `/${filePath}`;
    }
    return filePath;
}
exports.uriToFilePath = uriToFilePath;
function findFile(file, startLocation) {
    let lastParent;
    let parent = startLocation;
    while (parent && parent.length > 1 && parent !== lastParent) {
        const packages = path.join(parent, file);
        if (fs.existsSync(packages))
            return packages;
        lastParent = parent;
        parent = path.dirname(parent);
    }
    return undefined;
}
exports.findFile = findFile;
function formatPathForVm(file) {
    // Handle drive letter inconsistencies.
    file = forceWindowsDriveLetterToUppercase(file);
    // Convert any Windows backslashes to forward slashes.
    file = file.replace(/\\/g, "/");
    // Remove any existing file:/(//) prefixes.
    file = file.replace(/^file:\/+/, ""); // TODO: Does this case ever get hit? Will it be over-encoded?
    // Remove any remaining leading slashes.
    file = file.replace(/^\/+/, "");
    // Ensure a single slash prefix.
    if (file.startsWith("dart:"))
        return file;
    else
        return `file:///${encodeURI(file)}`;
}
exports.formatPathForVm = formatPathForVm;
function forceWindowsDriveLetterToUppercase(p) {
    if (p && exports.isWin && path.isAbsolute(p) && p.charAt(0) === p.charAt(0).toLowerCase())
        p = p.substr(0, 1).toUpperCase() + p.substr(1);
    return p;
}
exports.forceWindowsDriveLetterToUppercase = forceWindowsDriveLetterToUppercase;
function isWithinPath(file, folder) {
    const relative = path.relative(folder, file);
    return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}
exports.isWithinPath = isWithinPath;
class PromiseCompleter {
    constructor() {
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}
exports.PromiseCompleter = PromiseCompleter;
//# sourceMappingURL=utils.js.map