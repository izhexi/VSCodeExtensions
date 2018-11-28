'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class AadTokenCache {
    static get(key) {
        return AadTokenCache.cache.get(key);
    }
    static set(key, value) {
        AadTokenCache.cache.set(key, value);
    }
    static clear() {
        AadTokenCache.cache.clear();
    }
}
AadTokenCache.cache = new Map();
exports.AadTokenCache = AadTokenCache;
//# sourceMappingURL=aadTokenCache.js.map