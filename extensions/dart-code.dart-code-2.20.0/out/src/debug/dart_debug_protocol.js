"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const utils_1 = require("./utils");
class DebuggerResult {
    constructor(result) {
        this.result = result;
    }
}
exports.DebuggerResult = DebuggerResult;
var SourceReportKind;
(function (SourceReportKind) {
    SourceReportKind[SourceReportKind["Coverage"] = 0] = "Coverage";
    SourceReportKind[SourceReportKind["PossibleBreakpoints"] = 1] = "PossibleBreakpoints";
})(SourceReportKind = exports.SourceReportKind || (exports.SourceReportKind = {}));
class RPCError {
    constructor(code, message, data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
    details() {
        return this.data == null ? null : this.data.details;
    }
    toString() {
        return `${this.code} ${this.message}`;
    }
}
exports.RPCError = RPCError;
class ObservatoryConnection {
    constructor(uri) {
        this.completers = {};
        this.eventListeners = {};
        this.nextId = 0;
        this.socket = new WebSocket(uri);
        this.socket.on("message", (data) => this.handleData(data.toString()));
    }
    onOpen(cb) {
        this.socket.on("open", cb);
    }
    // TODO: This API doesn't make it obvious you can only have one subscriber.
    onLogging(callback) {
        this.logging = callback;
    }
    getVersion() {
        return this.callMethod("getVersion");
    }
    getVM() {
        return this.callMethod("getVM");
    }
    getIsolate(isolateId) {
        return this.callMethod("getIsolate", { isolateId });
    }
    on(streamId, callback) {
        this.streamListen(streamId);
        this.eventListeners[streamId] = callback;
    }
    streamListen(streamId) {
        this.callMethod("streamListen", { streamId });
    }
    addBreakpointWithScriptUri(isolateId, scriptUri, line, column) {
        let data;
        data = { isolateId, scriptUri, line };
        if (column)
            data.column = column;
        return this.callMethod("addBreakpointWithScriptUri", data);
    }
    // None, Unhandled, and All
    setExceptionPauseMode(isolateId, mode) {
        return this.callMethod("setExceptionPauseMode", { isolateId, mode });
    }
    removeBreakpoint(isolateId, breakpointId) {
        return this.callMethod("removeBreakpoint", { isolateId, breakpointId });
    }
    pause(isolateId) {
        return this.callMethod("pause", { isolateId });
    }
    // Into, Over, OverAsyncSuspension, and Out
    resume(isolateId, step) {
        return this.callMethod("resume", { isolateId, step });
    }
    getStack(isolateId) {
        return this.callMethod("getStack", { isolateId });
    }
    // TODO: Make these strongly-typed - DebuggerResult -> SourceReport? DebuggerResult<SourceReport>?
    // Do we need DebuggerResult?
    getSourceReport(isolate, reports, script) {
        return this.callMethod("getSourceReport", { isolateId: isolate.id, reports: reports.map((r) => SourceReportKind[r]), scriptId: script.id });
    }
    getObject(isolateId, objectId, offset, count) {
        let data;
        data = { isolateId, objectId };
        if (offset)
            data.offset = offset;
        if (count)
            data.count = count;
        return this.callMethod("getObject", data);
    }
    evaluate(isolateId, targetId, expression) {
        return this.callMethod("evaluate", {
            expression,
            isolateId,
            targetId,
        });
    }
    evaluateInFrame(isolateId, frameIndex, expression) {
        return this.callMethod("evaluateInFrame", {
            expression,
            frameIndex,
            isolateId,
        });
    }
    setLibraryDebuggable(isolateId, libraryId, isDebuggable) {
        return this.callMethod("setLibraryDebuggable", { isolateId, libraryId, isDebuggable });
    }
    callMethod(method, params) {
        const id = `${this.nextId++}`;
        const completer = new utils_1.PromiseCompleter();
        this.completers[id] = completer;
        let json;
        json = { id, method };
        if (params)
            json.params = params;
        const str = JSON.stringify(json);
        this.logTraffic(`==> ${str}\n`);
        this.socket.send(str);
        return completer.promise;
    }
    handleData(data) {
        this.logTraffic(`<== ${data}\n`);
        let json;
        json = JSON.parse(data);
        const id = json.id;
        const method = json.method;
        const error = json.error;
        const completer = this.completers[id];
        if (completer) {
            delete this.completers[id];
            if (error)
                completer.reject(new RPCError(error.code, error.message, error.data));
            else
                completer.resolve(new DebuggerResult(json.result));
        }
        else if (method) {
            const params = json.params;
            const streamId = params.streamId;
            const callback = this.eventListeners[streamId];
            if (callback)
                callback(params.event);
        }
    }
    onError(cb) {
        this.socket.on("error", cb);
    }
    onClose(cb) {
        this.socket.on("close", cb);
    }
    logTraffic(message) {
        if (this.logging) {
            this.logging(message);
        }
    }
    close() {
        this.socket.close();
    }
}
ObservatoryConnection.bannerRegex = new RegExp("Observatory (?:listening on|.* is available at:) (http:.+)");
ObservatoryConnection.httpLinkRegex = new RegExp("(http://[\\d\\.:]+/)");
exports.ObservatoryConnection = ObservatoryConnection;
//# sourceMappingURL=dart_debug_protocol.js.map