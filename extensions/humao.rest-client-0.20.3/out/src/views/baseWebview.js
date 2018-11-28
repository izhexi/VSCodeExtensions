'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const Constants = __importStar(require("../common/constants"));
const configurationSettings_1 = require("../models/configurationSettings");
class BaseWebview {
    constructor() {
        this._onDidCloseAllWebviewPanels = new vscode_1.EventEmitter();
        this.settings = configurationSettings_1.RestClientSettings.Instance;
        this.extensionPath = vscode_1.extensions.getExtension(Constants.ExtensionId).extensionPath;
        this.panels = [];
        this.styleFilePath = vscode_1.Uri.file(path.join(this.extensionPath, Constants.CSSFolderName, Constants.CSSFileName))
            .with({ scheme: 'vscode-resource' });
        this.styleFolderPath = vscode_1.Uri.file(path.join(this.extensionPath, Constants.CSSFolderName));
        this.scriptFilePath = vscode_1.Uri.file(path.join(this.extensionPath, Constants.ScriptsFolderName, Constants.ScriptFileName))
            .with({ scheme: 'vscode-resource' });
        this.scriptFolderPath = vscode_1.Uri.file(path.join(this.extensionPath, Constants.ScriptsFolderName));
    }
    get onDidCloseAllWebviewPanels() {
        return this._onDidCloseAllWebviewPanels.event;
    }
}
exports.BaseWebview = BaseWebview;
//# sourceMappingURL=baseWebview.js.map