"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestStore {
    constructor() {
        this.cache = new Map();
        this.cancelledRequestIds = new Set();
        this.completedRequestIds = new Set();
    }
    static get Instance() {
        if (!RequestStore._instance) {
            RequestStore._instance = new RequestStore();
        }
        return RequestStore._instance;
    }
    add(requestId, request) {
        if (request && requestId) {
            this.cache.set(requestId, request);
            this.currentRequestId = requestId;
        }
    }
    getLatest() {
        return this.cache.get(this.currentRequestId);
    }
    cancel(requestId) {
        requestId = requestId || this.currentRequestId;
        this.cancelledRequestIds.add(requestId);
    }
    isCancelled(requestId) {
        return this.cancelledRequestIds.has(requestId);
    }
    complete(requestId) {
        return requestId && this.completedRequestIds.add(requestId);
    }
    isCompleted(requestId) {
        requestId = requestId || this.currentRequestId;
        return this.completedRequestIds.has(requestId);
    }
}
exports.RequestStore = RequestStore;
//# sourceMappingURL=requestStore.js.map