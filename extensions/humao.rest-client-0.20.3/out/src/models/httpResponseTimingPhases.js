"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpResponseTimingPhases {
    constructor(total, wait, dns, tcp, firstByte, download) {
        this.total = total;
        this.wait = wait;
        this.dns = dns;
        this.tcp = tcp;
        this.firstByte = firstByte;
        this.download = download;
    }
}
exports.HttpResponseTimingPhases = HttpResponseTimingPhases;
//# sourceMappingURL=httpResponseTimingPhases.js.map