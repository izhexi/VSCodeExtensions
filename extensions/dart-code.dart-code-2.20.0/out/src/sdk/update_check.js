"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
const log_1 = require("../utils/log");
const utils_2 = require("./utils");
function checkForSdkUpdates(sdks, dartSdkVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!config_1.config.checkForSdkUpdates || sdks.projectType !== utils_1.ProjectType.Dart)
            return;
        // Someties people use the Dart SDK inside Flutter for non-Flutter projects. Since we'll never want
        // to do SDK update checks in that situation (esp. as it's VERSION file is bad!) we should skip in
        // that case.
        if (sdks.dartSdkIsFromFlutter)
            return;
        try {
            const version = yield utils_1.getLatestSdkVersion();
            if (utils_1.versionIsAtLeast(dartSdkVersion, version))
                return;
            const goToDownloadsAction = "Go to Dart Downloads";
            const dontShowAgainAction = "Disable Update Checks";
            const message = `Version ${version} of the Dart SDK is available (you have ${dartSdkVersion}). Some features of Dart Code may not work correctly with an old SDK.`;
            const action = yield vscode_1.window.showWarningMessage(message, goToDownloadsAction, dontShowAgainAction);
            if (action === goToDownloadsAction)
                utils_1.openInBrowser(utils_2.DART_DOWNLOAD_URL);
            else if (action === dontShowAgainAction)
                config_1.config.setCheckForSdkUpdates(false);
        }
        catch (e) {
            log_1.logError(e);
        }
    });
}
exports.checkForSdkUpdates = checkForSdkUpdates;
//# sourceMappingURL=update_check.js.map