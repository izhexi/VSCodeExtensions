'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const telemetry_1 = require("./telemetry");
function trace(eventName) {
    return (target, propertyKey, descriptor) => {
        if (descriptor === undefined) {
            descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
        }
        let originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            telemetry_1.Telemetry.sendEvent(eventName);
            return originalMethod.apply(this, args);
        };
        return descriptor;
    };
}
exports.trace = trace;
//# sourceMappingURL=decorator.js.map