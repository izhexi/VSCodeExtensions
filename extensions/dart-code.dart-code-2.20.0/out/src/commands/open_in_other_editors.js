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
const fs = require("fs");
const path = require("path");
const vs = require("vscode");
const utils_1 = require("../debug/utils");
const utils_2 = require("../sdk/utils");
const utils_3 = require("../utils");
const log_1 = require("../utils/log");
class OpenInOtherEditorCommands {
    constructor(sdks) {
        this.sdks = sdks;
        this.disposables = [];
        this.disposables.push(vs.commands.registerCommand("flutter.openInAndroidStudio", this.openInAndroidStudio, this), vs.commands.registerCommand("flutter.openInXcode", this.openInXcode, this));
    }
    openInAndroidStudio(resource) {
        return __awaiter(this, void 0, void 0, function* () {
            const folder = utils_3.fsPath(resource);
            let androidStudioDir = yield this.getAndroidStudioDir(folder);
            if (!androidStudioDir) {
                vs.window.showErrorMessage(`Unable to find Android Studio`);
                return;
            }
            if (utils_1.isMac && androidStudioDir.endsWith("/Contents")) {
                androidStudioDir = androidStudioDir.substr(0, androidStudioDir.length - "/Contents".length);
                utils_1.safeSpawn(folder, "open", ["-a", androidStudioDir, folder]);
            }
            else {
                utils_1.safeSpawn(folder, path.join(androidStudioDir, utils_2.androidStudioPath), [folder]);
            }
        });
    }
    openInXcode(resource) {
        return __awaiter(this, void 0, void 0, function* () {
            const folder = utils_3.fsPath(resource);
            const files = fs
                .readdirSync(folder)
                .filter((item) => fs.statSync(path.join(folder, item)).isDirectory())
                .filter((item) => item.endsWith(".xcworkspace") || item.endsWith(".xcodeproj"))
                .sort((f1, f2) => f1.endsWith(".xcworkspace") ? 0 : 1);
            if (!files || !files.length) {
                vs.window.showErrorMessage(`Unable to find an Xcode project in your 'ios' folder`);
                return;
            }
            const file = path.join(folder, files[0]);
            utils_1.safeSpawn(folder, "open", ["-a", "Xcode", file]);
        });
    }
    getAndroidStudioDir(folder) {
        return new Promise((resolve, reject) => {
            const binPath = path.join(this.sdks.flutter, utils_2.flutterPath);
            const proc = utils_1.safeSpawn(folder, binPath, ["config", "--machine"]);
            const output = [];
            proc.stdout.on("data", (data) => {
                output.push(data.toString());
            });
            proc.on("exit", () => {
                try {
                    if (output.length) {
                        const json = JSON.parse(output.join(""));
                        resolve(json["android-studio-dir"]);
                        return;
                    }
                }
                catch (e) {
                    log_1.logError(e);
                }
                reject();
            });
        });
    }
    dispose() {
        for (const command of this.disposables)
            command.dispose();
    }
}
exports.OpenInOtherEditorCommands = OpenInOtherEditorCommands;
//# sourceMappingURL=open_in_other_editors.js.map