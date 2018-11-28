"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../utils");
class StatusBarVersionTracker {
    constructor(projectType, dartSdkVersion, flutterSdkVersion, isDartSdkFromFlutter) {
        this.subscriptions = [];
        // Which switcher we show is based on whether we're in a Flutter project or not.
        const switchSdkCommand = projectType === utils_1.ProjectType.Flutter
            ? (config_1.config.flutterSdkPaths && config_1.config.flutterSdkPaths.length > 0 ? "dart.changeFlutterSdk" : null)
            : (config_1.config.sdkPaths && config_1.config.sdkPaths.length > 0 ? "dart.changeSdk" : null);
        // Render an approprite label for what we're calling this SDK.
        const label = projectType === utils_1.ProjectType.Flutter
            ? "Flutter"
            : (isDartSdkFromFlutter ? "Dart from Flutter" : "Dart");
        const versionLabel = (projectType === utils_1.ProjectType.Flutter || isDartSdkFromFlutter)
            ? flutterSdkVersion
            : dartSdkVersion;
        if (versionLabel) {
            this.addStatusBarItem(`${label}: ` + (versionLabel.length > 20 ? versionLabel.substr(0, 17) + "…" : versionLabel), `${label} SDK: ${versionLabel}`, switchSdkCommand);
        }
    }
    addStatusBarItem(text, tooltip, command) {
        const statusBarItem = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 2);
        statusBarItem.text = text;
        statusBarItem.tooltip = tooltip;
        statusBarItem.command = command;
        this.subscriptions.push(statusBarItem);
        this.subscriptions.push(vs.window.onDidChangeActiveTextEditor((e) => {
            if (e && e.document && utils_1.isAnalyzable(e.document))
                statusBarItem.show();
            else
                statusBarItem.hide();
        }));
        if (vs.window.activeTextEditor && vs.window.activeTextEditor.document && utils_1.isAnalyzable(vs.window.activeTextEditor.document))
            statusBarItem.show();
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
}
exports.StatusBarVersionTracker = StatusBarVersionTracker;
//# sourceMappingURL=status_bar_version_tracker.js.map