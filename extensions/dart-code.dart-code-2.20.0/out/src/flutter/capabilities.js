"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
class FlutterCapabilities {
    static get empty() { return new FlutterCapabilities("0.0.0"); }
    constructor(flutterVersion) {
        this.version = flutterVersion;
    }
    get supportsPidFileForMachine() { return utils_1.versionIsAtLeast(this.version, "0.10.0"); }
    get trackWidgetCreationDefault() { return utils_1.versionIsAtLeast(this.version, "0.10.2-pre"); }
}
exports.FlutterCapabilities = FlutterCapabilities;
//# sourceMappingURL=capabilities.js.map