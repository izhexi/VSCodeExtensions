"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const utils_1 = require("../debug/utils");
const log_1 = require("../utils/log");
// Reminder: This class is used in the debug adapter as well as the main Code process!
class StdIOService {
    constructor(getLogFile, logger, maxLogLineLength, messagesWrappedInBrackets = false, treatHandlingErrorsAsUnhandledMessages = false) {
        this.getLogFile = getLogFile;
        this.logger = logger;
        this.maxLogLineLength = maxLogLineLength;
        this.messagesWrappedInBrackets = messagesWrappedInBrackets;
        this.treatHandlingErrorsAsUnhandledMessages = treatHandlingErrorsAsUnhandledMessages;
        this.disposables = [];
        this.additionalPidsToTerminate = [];
        this.nextRequestID = 1;
        this.activeRequests = {};
        this.messageBuffer = [];
        this.requestErrorSubscriptions = [];
        this.processExited = false;
        this.currentLogFile = getLogFile();
    }
    createProcess(workingDirectory, binPath, args, envOverrides) {
        this.logTraffic(`Spawning ${binPath} with args ${JSON.stringify(args)}`);
        if (workingDirectory)
            this.logTraffic(`..  in ${workingDirectory}`);
        if (envOverrides)
            this.logTraffic(`..  with ${JSON.stringify(envOverrides)}`);
        this.process = utils_1.safeSpawn(workingDirectory, binPath, args, envOverrides);
        this.logTraffic(`    PID: ${process.pid}`);
        this.process.stdout.on("data", (data) => {
            const message = data.toString();
            // Add this message to the buffer for processing.
            this.messageBuffer.push(message);
            // Kick off processing if we have a full message.
            if (message.indexOf("\n") >= 0)
                this.processMessageBuffer();
        });
        this.process.stderr.on("data", (data) => {
            this.logTraffic(`${data.toString()}`, utils_1.LogSeverity.Error);
        });
        this.process.on("exit", (data) => {
            this.processExited = true;
        });
    }
    sendRequest(method, params) {
        // Generate an ID for this request so we can match up the response.
        const id = this.nextRequestID++;
        return new Promise((resolve, reject) => {
            // Stash the callbacks so we can call them later.
            this.activeRequests[id.toString()] = [resolve, reject, method];
            const req = {
                id: id.toString(),
                method,
                params,
            };
            const json = this.messagesWrappedInBrackets
                ? "[" + JSON.stringify(req) + "]\r\n"
                : JSON.stringify(req) + "\r\n";
            this.sendMessage(json);
        });
    }
    sendMessage(json) {
        this.logTraffic(`==> ${json}`);
        this.process.stdin.write(json);
    }
    processMessageBuffer() {
        let fullBuffer = this.messageBuffer.join("");
        this.messageBuffer = [];
        // If the message doesn't end with \n then put the last part back into the buffer.
        if (!fullBuffer.endsWith("\n")) {
            const lastNewline = fullBuffer.lastIndexOf("\n");
            const incompleteMessage = fullBuffer.substring(lastNewline + 1);
            fullBuffer = fullBuffer.substring(0, lastNewline);
            this.messageBuffer.push(incompleteMessage);
        }
        // Process the complete messages in the buffer.
        fullBuffer.split("\n").filter((m) => m.trim() !== "").forEach((m) => this.handleMessage(m));
    }
    // tslint:disable-next-line:no-empty
    processUnhandledMessage(message) { }
    handleMessage(message) {
        message = message.trim();
        this.logTraffic(`<== ${message}\r\n`);
        if (!this.shouldHandleMessage(message)) {
            this.processUnhandledMessage(message);
            return;
        }
        let msg;
        try {
            msg = JSON.parse(message);
            if (this.messagesWrappedInBrackets && msg && msg.length === 1)
                msg = msg[0];
        }
        catch (e) {
            if (this.treatHandlingErrorsAsUnhandledMessages) {
                log_1.logError(`Unexpected non-JSON message, assuming normal stdout (${e})\n\n${e.stack}\n\n${message}`);
                this.processUnhandledMessage(message);
                return;
            }
            else {
                throw e;
            }
        }
        try {
            if (msg && this.isNotification(msg))
                this.handleNotification(msg);
            else if (msg && this.isResponse(msg))
                this.handleResponse(msg);
            else {
                log_1.logError(`Unexpected JSON message, assuming normal stdout : ${message}`);
                this.processUnhandledMessage(message);
            }
        }
        catch (e) {
            if (this.treatHandlingErrorsAsUnhandledMessages) {
                log_1.logError(`Failed to handle JSON message, assuming normal stdout (${e})\n\n${e.stack}\n\n${message}`);
                this.processUnhandledMessage(message);
            }
            else {
                throw e;
            }
        }
    }
    isNotification(msg) { return !!msg.event; }
    isResponse(msg) { return !!msg.id; }
    handleResponse(evt) {
        const handler = this.activeRequests[evt.id];
        delete this.activeRequests[evt.id];
        const method = handler[2];
        const error = evt.error;
        if (error && error.code === "SERVER_ERROR") {
            error.method = method;
            this.notify(this.requestErrorSubscriptions, error);
        }
        if (error) {
            handler[1](error);
        }
        else {
            handler[0](evt.result);
        }
    }
    notify(subscriptions, notification) {
        subscriptions.slice().forEach((sub) => sub(notification));
    }
    subscribe(subscriptions, subscriber) {
        subscriptions.push(subscriber);
        const disposable = {
            dispose: () => {
                // Remove from the subscription list.
                let index = subscriptions.indexOf(subscriber);
                if (index >= 0) {
                    subscriptions.splice(index, 1);
                }
                // Also remove from our disposables (else we'll leak it).
                index = this.disposables.indexOf(disposable);
                if (index >= 0) {
                    this.disposables.splice(index, 1);
                }
            },
        };
        this.disposables.push(disposable);
        return disposable;
    }
    registerForRequestError(subscriber) {
        return this.subscribe(this.requestErrorSubscriptions, subscriber);
    }
    logTraffic(message, severity = utils_1.LogSeverity.Info) {
        this.logger(message, severity);
        const newLogFile = this.getLogFile();
        if (newLogFile !== this.currentLogFile && this.logStream) {
            this.logStream.end();
            this.logStream = undefined;
        }
        if (!newLogFile)
            return;
        this.currentLogFile = newLogFile;
        if (!this.logStream) {
            this.logStream = fs.createWriteStream(this.currentLogFile);
            this.logStream.write(log_1.getLogHeader());
        }
        this.logStream.write(`[${(new Date()).toLocaleTimeString()}]: `);
        if (this.maxLogLineLength && message.length > this.maxLogLineLength)
            this.logStream.write(message.substring(0, this.maxLogLineLength) + "…\r\n");
        else
            this.logStream.write(message.trim() + "\r\n");
    }
    dispose() {
        if (this.logStream) {
            this.logStream.end();
            this.logStream = null;
        }
        for (const pid of this.additionalPidsToTerminate) {
            try {
                process.kill(pid);
            }
            catch (e) {
                // TODO: Logger knows the category!
                log_1.logError({ message: e.toString() });
            }
        }
        this.additionalPidsToTerminate.length = 0;
        try {
            if (!this.processExited && this.process && !this.process.killed)
                this.process.kill();
        }
        catch (e) {
            // This tends to throw a lot because the shell process quit when we terminated the related
            // process above, so just swallow the error.
        }
        this.process = undefined;
        this.disposables.forEach((d) => d.dispose());
    }
}
exports.StdIOService = StdIOService;
class Request {
}
exports.Request = Request;
class Response {
}
exports.Response = Response;
class UnknownResponse extends Response {
}
exports.UnknownResponse = UnknownResponse;
class Notification {
}
exports.Notification = Notification;
class UnknownNotification extends Notification {
}
exports.UnknownNotification = UnknownNotification;
//# sourceMappingURL=stdio_service.js.map