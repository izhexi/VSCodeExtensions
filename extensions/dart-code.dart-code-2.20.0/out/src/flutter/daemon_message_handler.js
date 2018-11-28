"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const channels_1 = require("../commands/channels");
const log_1 = require("../utils/log");
function setUpDaemonMessageHandler(context, daemon) {
    context.subscriptions.push(daemon.registerForDaemonLogMessage((l) => {
        const channel = channels_1.getChannel("Flutter Daemon");
        // Don't show, as we get errors from this just when disconnected devices!
        // channel.show(true);
        channel.appendLine(`[${l.level}] ${l.message}`);
    }));
    context.subscriptions.push(daemon.registerForDaemonShowMessage((l) => {
        const title = l.title.trim().endsWith(".") ? l.title.trim() : `${l.title.trim()}.`;
        const message = `${title} ${l.message}`.trim();
        switch (l.level) {
            case "info":
                vscode_1.window.showInformationMessage(message);
                break;
            case "warning":
                vscode_1.window.showWarningMessage(message);
                break;
            case "error":
                vscode_1.window.showErrorMessage(message);
                break;
            default:
                log_1.logWarn(`Unexpected daemon.showMessage type: ${l.level}`);
        }
    }));
}
exports.setUpDaemonMessageHandler = setUpDaemonMessageHandler;
//# sourceMappingURL=daemon_message_handler.js.map