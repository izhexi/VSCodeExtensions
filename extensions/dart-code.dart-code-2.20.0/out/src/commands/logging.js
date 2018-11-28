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
const path = require("path");
const vs = require("vscode");
const utils_1 = require("../debug/utils");
const utils_2 = require("../utils");
const log_1 = require("../utils/log");
exports.STOP_LOGGING = "Stop Logging";
class LoggingCommands {
    constructor(extensionLogPath) {
        this.extensionLogPath = extensionLogPath;
        this.disposables = [];
        this.disposables.push(vs.commands.registerCommand("dart.startLogging", this.startLogging, this));
    }
    startLogging() {
        return __awaiter(this, void 0, void 0, function* () {
            const logFilename = path.join(utils_1.forceWindowsDriveLetterToUppercase(this.extensionLogPath), this.generateFilename());
            const logUri = vs.Uri.file(logFilename);
            utils_2.createFolderForFile(logFilename);
            const selectedLogCategories = yield vs.window.showQuickPick(Object.keys(log_1.userSelectableLogCategories).map((k) => ({
                label: k,
                logCategory: log_1.userSelectableLogCategories[k],
                picked: true,
            })), {
                canPickMany: true,
                placeHolder: "Select which categories to include in the log",
            });
            if (!selectedLogCategories || !selectedLogCategories.length)
                return;
            const allLoggedCategories = _.concat(utils_1.LogCategory.General, selectedLogCategories.map((s) => s.logCategory));
            const logger = log_1.logTo(utils_2.fsPath(logUri), allLoggedCategories);
            this.disposables.push(logger);
            yield vs.window.showInformationMessage(`Dart and Flutter logs are being captured. Reproduce your issue then click ${exports.STOP_LOGGING}.`, exports.STOP_LOGGING);
            yield logger.dispose();
            const doc = yield vs.workspace.openTextDocument(logUri);
            yield vs.window.showTextDocument(doc);
            return logFilename;
        });
    }
    generateFilename() {
        const pad = (s) => `0${s.toString()}`.slice(-2);
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${pad(now.getMonth())}-${pad(now.getDay())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        return `Dart-Code-Log-${formattedDate}.txt`;
    }
    dispose() {
        for (const command of this.disposables)
            command.dispose();
    }
}
exports.LoggingCommands = LoggingCommands;
//# sourceMappingURL=logging.js.map