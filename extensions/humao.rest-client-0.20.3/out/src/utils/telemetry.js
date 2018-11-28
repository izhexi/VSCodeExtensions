'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const appInsights = __importStar(require("applicationinsights"));
const Constants = __importStar(require("../common/constants"));
const configurationSettings_1 = require("../models/configurationSettings");
appInsights.setup(Constants.AiKey)
    .setAutoCollectConsole(false)
    .setAutoCollectDependencies(false)
    .setAutoCollectExceptions(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectRequests(false)
    .setAutoDependencyCorrelation(false)
    .setUseDiskRetryCaching(true)
    .start();
class Telemetry {
    static sendEvent(eventName, properties) {
        try {
            if (Telemetry.restClientSettings.enableTelemetry) {
                appInsights.defaultClient.trackEvent({ name: eventName, properties });
            }
        }
        catch (_a) {
        }
    }
}
Telemetry.restClientSettings = configurationSettings_1.RestClientSettings.Instance;
exports.Telemetry = Telemetry;
//# sourceMappingURL=telemetry.js.map