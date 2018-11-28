"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
function getHeader(headers, name) {
    if (!headers || !name) {
        return null;
    }
    const headerName = Object.keys(headers).find(h => h.toLowerCase() === name.toLowerCase());
    return headerName && headers[headerName];
}
exports.getHeader = getHeader;
function hasHeader(headers, name) {
    return !!(headers && name && Object.keys(headers).some(h => h.toLowerCase() === name.toLowerCase()));
}
exports.hasHeader = hasHeader;
function calculateMD5Hash(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}
exports.calculateMD5Hash = calculateMD5Hash;
function isJSONString(text) {
    try {
        JSON.parse(text);
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.isJSONString = isJSONString;
//# sourceMappingURL=misc.js.map