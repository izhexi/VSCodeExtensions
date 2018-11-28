"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_service_1 = require("../services/stdio_service");
class TestRunner extends stdio_service_1.StdIOService {
    constructor(executable, projectFolder, args, envOverrides, logFile, logger, maxLogLineLength) {
        super(() => logFile, logger, maxLogLineLength, true, true);
        this.unhandledMessageSubscriptions = [];
        // Subscription lists.
        this.testStartedProcessSubscriptions = [];
        this.allTestNotificationsSubscriptions = [];
        this.createProcess(projectFolder, executable, args, envOverrides);
    }
    shouldHandleMessage(message) {
        return (message.startsWith("{") && message.endsWith("}"))
            || (message.startsWith("[{") && message.endsWith("}]"));
    }
    isNotification(msg) { return !!(msg.type || msg.event); }
    isResponse(msg) { return false; }
    processUnhandledMessage(message) {
        this.notify(this.unhandledMessageSubscriptions, message);
    }
    registerForUnhandledMessages(subscriber) {
        return this.subscribe(this.unhandledMessageSubscriptions, subscriber);
    }
    handleNotification(evt) {
        // console.log(JSON.stringify(evt));
        switch (evt.event) {
            case "test.startedProcess":
                this.notify(this.testStartedProcessSubscriptions, evt.params);
                break;
        }
        // Send all events to the editor.
        this.notify(this.allTestNotificationsSubscriptions, evt);
    }
    // Subscription methods.
    registerForTestStartedProcess(subscriber) {
        return this.subscribe(this.testStartedProcessSubscriptions, subscriber);
    }
    registerForAllTestNotifications(subscriber) {
        return this.subscribe(this.allTestNotificationsSubscriptions, subscriber);
    }
}
exports.TestRunner = TestRunner;
//# sourceMappingURL=test_runner.js.map