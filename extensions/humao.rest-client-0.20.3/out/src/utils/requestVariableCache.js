"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class RequestVariableCache {
    static get onDidCreateNewRequestVariable() {
        return RequestVariableCache.eventEmitter.event;
    }
    static get size() {
        return RequestVariableCache.cache.size;
    }
    static add(cacheKey, value) {
        RequestVariableCache.cache.set(cacheKey.getCacheKey(), value);
        RequestVariableCache.eventEmitter.fire({ cacheKey });
    }
    static has(cacheKey) {
        return RequestVariableCache.cache.has(cacheKey.getCacheKey());
    }
    static get(cacheKey) {
        return RequestVariableCache.cache.get(cacheKey.getCacheKey());
    }
    static remove(cacheKey) {
        RequestVariableCache.cache.delete(cacheKey.getCacheKey());
    }
}
RequestVariableCache.cache = new Map();
RequestVariableCache.eventEmitter = new vscode_1.EventEmitter();
exports.RequestVariableCache = RequestVariableCache;
//# sourceMappingURL=requestVariableCache.js.map