"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RequestVariableCacheKey {
    constructor(key, documentUri) {
        this.key = key;
        this.documentUri = documentUri;
    }
    getCacheKey() {
        return `${this.key}@${this.documentUri}`;
    }
}
exports.RequestVariableCacheKey = RequestVariableCacheKey;
//# sourceMappingURL=requestVariableCacheKey.js.map