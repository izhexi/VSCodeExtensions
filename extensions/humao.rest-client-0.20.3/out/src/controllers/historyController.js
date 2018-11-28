"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs-extra"));
const moment_1 = __importDefault(require("moment"));
const os_1 = require("os");
const vscode_1 = require("vscode");
const historyQuickPickItem_1 = require("../models/historyQuickPickItem");
const decorator_1 = require("../utils/decorator");
const persistUtility_1 = require("../utils/persistUtility");
let tmp = require('tmp');
class HistoryController {
    constructor() {
        this._outputChannel = vscode_1.window.createOutputChannel('REST');
    }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let requests = yield persistUtility_1.PersistUtility.loadRequests();
                if (!requests || requests.length <= 0) {
                    vscode_1.window.showInformationMessage("No request history items are found!");
                    return;
                }
                let itemPickList = requests.map(request => {
                    // TODO: add headers and body in pick item?
                    let item = new historyQuickPickItem_1.HistoryQuickPickItem();
                    item.label = `${request.method.toUpperCase()} ${request.url}`;
                    if (request.body && typeof request.body === 'string' && request.body.length > 0) {
                        item.description = `${request.body.length} body bytes`;
                    }
                    if (request.startTime) {
                        item.detail = `${moment_1.default().to(request.startTime)}`;
                    }
                    item.rawRequest = request;
                    return item;
                });
                let item = yield vscode_1.window.showQuickPick(itemPickList, { placeHolder: "" });
                if (!item) {
                    return;
                }
                let path = yield this.createRequestInTempFile(item.rawRequest);
                let document = yield vscode_1.workspace.openTextDocument(path);
                vscode_1.window.showTextDocument(document);
            }
            catch (error) {
                this.errorHandler(error);
            }
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                vscode_1.window.showInformationMessage(`Do you really want to clear request history?`, { title: 'Yes' }, { title: 'No' })
                    .then(function (btn) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (btn) {
                            if (btn.title === 'Yes') {
                                yield persistUtility_1.PersistUtility.clearRequests();
                                vscode_1.window.showInformationMessage('Request history has been cleared');
                            }
                        }
                    });
                });
            }
            catch (error) {
                this.errorHandler(error);
            }
        });
    }
    createRequestInTempFile(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                tmp.file({ prefix: 'vscode-restclient-', postfix: ".http" }, function _tempFileCreated(err, tmpFilePath, fd) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    let output = `${request.method.toUpperCase()} ${request.url}${os_1.EOL}`;
                    if (request.headers) {
                        for (let header in request.headers) {
                            if (request.headers.hasOwnProperty(header)) {
                                let value = request.headers[header];
                                output += `${header}: ${value}${os_1.EOL}`;
                            }
                        }
                    }
                    if (request.body) {
                        output += `${os_1.EOL}${request.body}`;
                    }
                    fs.writeFile(tmpFilePath, output, error => {
                        reject(error);
                        return;
                    });
                    resolve(tmpFilePath);
                });
            });
        });
    }
    errorHandler(error) {
        this._outputChannel.appendLine(error);
        vscode_1.window.showErrorMessage("There was an error, please view details in output log");
    }
    dispose() {
        this._outputChannel.dispose();
    }
}
__decorate([
    decorator_1.trace('History')
], HistoryController.prototype, "save", null);
__decorate([
    decorator_1.trace('Clear History')
], HistoryController.prototype, "clear", null);
exports.HistoryController = HistoryController;
//# sourceMappingURL=historyController.js.map