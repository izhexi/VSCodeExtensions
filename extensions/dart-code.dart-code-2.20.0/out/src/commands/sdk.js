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
const os = require("os");
const path = require("path");
const vs = require("vscode");
const vscode_1 = require("vscode");
const config_1 = require("../config");
const utils_1 = require("../debug/utils");
const project_1 = require("../project");
const dart_hover_provider_1 = require("../providers/dart_hover_provider");
const sdk_manager_1 = require("../sdk/sdk_manager");
const utils_2 = require("../sdk/utils");
const util = require("../utils");
const utils_3 = require("../utils");
const channels = require("./channels");
const flutterNameRegex = new RegExp("^[a-z][a-z0-9_]*$");
class SdkCommands {
    constructor(context, sdks, analytics) {
        // A map of any in-progress commands so we can terminate them if we want to run another.
        this.runningCommands = {};
        this.sdks = sdks;
        this.analytics = analytics;
        const dartSdkManager = new sdk_manager_1.DartSdkManager(sdks);
        context.subscriptions.push(vs.commands.registerCommand("dart.changeSdk", () => dartSdkManager.changeSdk()));
        if (sdks.projectType === utils_3.ProjectType.Flutter) {
            const flutterSdkManager = new sdk_manager_1.FlutterSdkManager(sdks);
            context.subscriptions.push(vs.commands.registerCommand("dart.changeFlutterSdk", () => flutterSdkManager.changeSdk()));
        }
        context.subscriptions.push(vs.commands.registerCommand("dart.getPackages", (uri) => __awaiter(this, void 0, void 0, function* () {
            if (!uri || !(uri instanceof vscode_1.Uri))
                uri = yield this.getFolderToRunCommandIn("Select which folder to get packages for");
            if (typeof uri === "string")
                uri = vs.Uri.file(uri);
            try {
                if (utils_3.isFlutterWorkspaceFolder(vs.workspace.getWorkspaceFolder(uri)))
                    return this.runFlutter(["packages", "get"], uri);
                else
                    return this.runPub(["get"], uri);
            }
            finally {
                // TODO: Move this to a reusable event.
                dart_hover_provider_1.DartHoverProvider.clearPackageMapCaches();
            }
        })));
        context.subscriptions.push(vs.commands.registerCommand("dart.upgradePackages", (uri) => __awaiter(this, void 0, void 0, function* () {
            if (!uri || !(uri instanceof vscode_1.Uri))
                uri = yield this.getFolderToRunCommandIn("Select which folder to upgrade packages in");
            if (typeof uri === "string")
                uri = vs.Uri.file(uri);
            if (utils_3.isFlutterWorkspaceFolder(vs.workspace.getWorkspaceFolder(uri)))
                return this.runFlutter(["packages", "upgrade"], uri);
            else
                return this.runPub(["upgrade"], uri);
        })));
        // Pub commands.
        context.subscriptions.push(vs.commands.registerCommand("pub.get", (selection) => {
            return vs.commands.executeCommand("dart.getPackages", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("pub.upgrade", (selection) => {
            return vs.commands.executeCommand("dart.upgradePackages", selection);
        }));
        // Flutter commands.
        context.subscriptions.push(vs.commands.registerCommand("flutter.packages.get", (selection) => __awaiter(this, void 0, void 0, function* () {
            if (!selection)
                selection = vs.Uri.file(yield this.getFolderToRunCommandIn(`Select the folder to run "flutter packages get" in`, selection));
            // If we're working on the flutter repository, map this on to update-packages.
            if (selection && utils_3.fsPath(selection) === sdks.flutter) {
                return this.runFlutter(["update-packages"], selection);
            }
            try {
                return this.runFlutter(["packages", "get"], selection);
            }
            finally {
                // TODO: Move this to a reusable event.
                dart_hover_provider_1.DartHoverProvider.clearPackageMapCaches();
            }
        })));
        context.subscriptions.push(vs.commands.registerCommand("flutter.screenshot", (uri) => __awaiter(this, void 0, void 0, function* () {
            let shouldNotify = false;
            // TODO: Why do we do this? What is the uri used for?!
            if (!uri || !(uri instanceof vscode_1.Uri)) {
                // If there is no path for this session, or it differs from config, use the one from config.
                if (!this.flutterScreenshotPath ||
                    (config_1.config.flutterScreenshotPath && this.flutterScreenshotPath !== config_1.config.flutterScreenshotPath)) {
                    this.flutterScreenshotPath = config_1.config.flutterScreenshotPath;
                    shouldNotify = true;
                }
                // If path is still empty, bring up the folder selector.
                if (!this.flutterScreenshotPath) {
                    const selectedFolder = yield vscode_1.window.showOpenDialog({ canSelectFolders: true, openLabel: "Set screenshots folder" });
                    if (selectedFolder && selectedFolder.length > 0) {
                        // Set variable to selected path. This allows prompting the user only once.
                        this.flutterScreenshotPath = selectedFolder[0].path;
                        shouldNotify = true;
                    }
                    else {
                        // Do nothing if the user cancelled the folder selection.
                        return;
                    }
                }
                // Ensure folder exists.
                util.mkDirRecursive(this.flutterScreenshotPath);
            }
            yield this.runFlutterInFolder(this.flutterScreenshotPath, ["screenshot"], "screenshot");
            if (shouldNotify) {
                const res = yield vs.window.showInformationMessage(`Screenshots will be saved to ${this.flutterScreenshotPath}`, "Show Folder");
                if (res)
                    yield vs.commands.executeCommand("revealFileInOS", vscode_1.Uri.file(this.flutterScreenshotPath));
            }
        })));
        context.subscriptions.push(vs.commands.registerCommand("flutter.packages.upgrade", (selection) => {
            return vs.commands.executeCommand("dart.upgradePackages", selection);
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.doctor", (selection) => {
            if (!sdks.flutter) {
                utils_2.showFlutterActivationFailure("flutter.doctor");
                return;
            }
            const tempDir = path.join(os.tmpdir(), "dart-code-cmd-run");
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir);
            return this.runFlutterInFolder(tempDir, ["doctor"], "flutter");
        }));
        context.subscriptions.push(vs.commands.registerCommand("flutter.upgrade", (selection) => __awaiter(this, void 0, void 0, function* () {
            if (!sdks.flutter) {
                utils_2.showFlutterActivationFailure("flutter.upgrade");
                return;
            }
            const tempDir = path.join(os.tmpdir(), "dart-code-cmd-run");
            if (!fs.existsSync(tempDir))
                fs.mkdirSync(tempDir);
            yield this.runFlutterInFolder(tempDir, ["upgrade"], "flutter");
            yield util.reloadExtension();
        })));
        context.subscriptions.push(vs.commands.registerCommand("flutter.createProject", (_) => this.createFlutterProject()));
        // Internal command that's fired in user_prompts to actually do the creation.
        context.subscriptions.push(vs.commands.registerCommand("_flutter.create", (projectPath, projectName) => {
            projectName = projectName || path.basename(projectPath);
            const args = ["create"];
            if (config_1.config.flutterCreateOrganization) {
                args.push("--org");
                args.push(config_1.config.flutterCreateOrganization);
            }
            if (config_1.config.flutterCreateIOSLanguage) {
                args.push("--ios-language");
                args.push(config_1.config.flutterCreateIOSLanguage);
            }
            if (config_1.config.flutterCreateAndroidLanguage) {
                args.push("--android-language");
                args.push(config_1.config.flutterCreateAndroidLanguage);
            }
            args.push(projectName);
            return this.runFlutterInFolder(path.dirname(projectPath), args, projectName);
        }));
        // Internal command that's fired in user_prompts to actually do the creation.
        context.subscriptions.push(vs.commands.registerCommand("_flutter.clean", (projectPath, projectName) => {
            projectName = projectName || path.basename(projectPath);
            const args = ["clean"];
            return this.runFlutterInFolder(path.dirname(projectPath), args, projectName);
        }));
        // Hook saving pubspec to run pub.get.
        context.subscriptions.push(vs.workspace.onDidSaveTextDocument((td) => {
            const conf = config_1.config.for(td.uri);
            if (path.basename(utils_3.fsPath(td.uri)).toLowerCase() !== "pubspec.yaml")
                return;
            if (!conf.runPubGetOnPubspecChanges)
                return;
            // If we're in Fuchsia, we don't want to `pub get` by default but we do want to allow
            // it to be overridden, so only read the setting if it's been declared explicitly.
            if (sdks.projectType === utils_3.ProjectType.Fuchsia && !conf.runPubGetOnPubspecChangesIsConfiguredExplicitly)
                return;
            vs.commands.executeCommand("dart.getPackages", td.uri);
        }));
    }
    runCommandForWorkspace(handler, placeHolder, args, selection) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderToRunCommandIn = yield this.getFolderToRunCommandIn(placeHolder, selection);
            const containingWorkspace = vs.workspace.getWorkspaceFolder(vs.Uri.file(folderToRunCommandIn));
            const containingWorkspacePath = utils_3.fsPath(containingWorkspace.uri);
            // Display the relative path from the workspace root to the folder we're running, or if they're
            // the same then the folder name we're running in.
            const shortPath = path.relative(containingWorkspacePath, folderToRunCommandIn)
                || path.basename(folderToRunCommandIn);
            return handler(folderToRunCommandIn, args, shortPath);
        });
    }
    getFolderToRunCommandIn(placeHolder, selection) {
        return __awaiter(this, void 0, void 0, function* () {
            let file = selection && utils_3.fsPath(selection);
            file = file || (vs.window.activeTextEditor && utils_3.fsPath(vs.window.activeTextEditor.document.uri));
            let folder = file && project_1.locateBestProjectRoot(file);
            // If there's only one folder, just use it to avoid prompting the user.
            if (!folder && vs.workspace.workspaceFolders) {
                const allowedProjects = util.getDartWorkspaceFolders();
                if (allowedProjects.length === 1)
                    folder = utils_3.fsPath(allowedProjects[0].uri);
            }
            return folder
                ? Promise.resolve(folder)
                // TODO: Can we get this filtered?
                // https://github.com/Microsoft/vscode/issues/39132
                : vs.window.showWorkspaceFolderPick({ placeHolder }).then((f) => f && util.isDartWorkspaceFolder(f) && utils_3.fsPath(f.uri)); // TODO: What if the user didn't pick anything?
        });
    }
    runFlutter(args, selection) {
        return this.runCommandForWorkspace(this.runFlutterInFolder.bind(this), `Select the folder to run "flutter ${args.join(" ")}" in`, args, selection);
    }
    runFlutterInFolder(folder, args, shortPath) {
        const binPath = path.join(this.sdks.flutter, utils_2.flutterPath);
        return this.runCommandInFolder(shortPath, "flutter", folder, binPath, utils_1.globalFlutterArgs.concat(args));
    }
    runPub(args, selection) {
        return this.runCommandForWorkspace(this.runPubInFolder.bind(this), `Select the folder to run "pub ${args.join(" ")}")}" in`, args, selection);
    }
    runPubInFolder(folder, args, shortPath) {
        const binPath = path.join(this.sdks.dart, utils_2.pubPath);
        args = args.concat(...config_1.config.for(vs.Uri.file(folder)).pubAdditionalArgs);
        return this.runCommandInFolder(shortPath, "pub", folder, binPath, args);
    }
    runCommandInFolder(shortPath, commandName, folder, binPath, args, isStartingBecauseOfTermination = false) {
        const channelName = commandName.substr(0, 1).toUpperCase() + commandName.substr(1);
        const channel = channels.createChannel(channelName);
        channel.show(true);
        // Figure out if there's already one of this command running, in which case we'll chain off the
        // end of it.
        const commandId = `${folder}|${commandName}|${args}`;
        const existingProcess = this.runningCommands[commandId];
        if (existingProcess && !existingProcess.hasStarted) {
            // We already have a queued version of this command so there's no value in queueing another
            // just bail.
            return Promise.resolve(null);
        }
        return vs.window.withProgress({
            cancellable: true,
            location: vscode_1.ProgressLocation.Notification,
            title: `${commandName} ${args.join(" ")}`,
        }, (progress, token) => {
            if (existingProcess) {
                progress.report({ message: "terminating previous command..." });
                existingProcess.cancel();
            }
            else {
                channel.clear();
            }
            const process = new ChainedProcess(() => {
                channel.appendLine(`[${shortPath}] ${commandName} ${args.join(" ")}`);
                progress.report({ message: "running..." });
                const proc = utils_1.safeSpawn(folder, binPath, args);
                channels.runProcessInChannel(proc, channel);
                return proc;
            }, existingProcess);
            this.runningCommands[commandId] = process;
            token.onCancellationRequested(() => process.cancel());
            return process.completed;
        });
    }
    createFlutterProject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.sdks || !this.sdks.flutter) {
                utils_2.showFlutterActivationFailure("flutter.newProject");
                return;
            }
            const name = yield vs.window.showInputBox({ prompt: "Enter a name for your new project", placeHolder: "hello_world", validateInput: this.validateFlutterProjectName });
            if (!name)
                return;
            // If already in a workspace, set the default folder to somethign nearby.
            const folders = yield vs.window.showOpenDialog({ canSelectFolders: true, openLabel: "Select a folder to create the project in" });
            if (!folders || folders.length !== 1)
                return;
            const folderUri = folders[0];
            const projectFolderUri = vscode_1.Uri.file(path.join(utils_3.fsPath(folderUri), name));
            if (fs.existsSync(utils_3.fsPath(projectFolderUri))) {
                vs.window.showErrorMessage(`A folder named ${name} already exists in ${utils_3.fsPath(folderUri)}`);
                return;
            }
            // Create the empty folder so we can open it.
            fs.mkdirSync(utils_3.fsPath(projectFolderUri));
            // Create a temp dart file to force extension to load when we open this folder.
            fs.writeFileSync(path.join(utils_3.fsPath(projectFolderUri), util.FLUTTER_CREATE_PROJECT_TRIGGER_FILE), "");
            const hasFoldersOpen = !!(vs.workspace.workspaceFolders && vs.workspace.workspaceFolders.length);
            const openInNewWindow = hasFoldersOpen;
            vs.commands.executeCommand("vscode.openFolder", projectFolderUri, openInNewWindow);
        });
    }
    validateFlutterProjectName(input) {
        if (!flutterNameRegex.test(input))
            return "Flutter project names should be all lowercase, with underscores to separate words";
        const bannedNames = ["flutter", "flutter_test"];
        if (bannedNames.indexOf(input) !== -1)
            return `You may not use ${input} as the name for a flutter project`;
    }
}
exports.SdkCommands = SdkCommands;
class ChainedProcess {
    constructor(spawn, parent) {
        this.spawn = spawn;
        this.parent = parent;
        this.processNumber = ChainedProcess.processNumber++;
        this.completer = new utils_1.PromiseCompleter();
        this.completed = this.completer.promise;
        this.isCancelled = false;
        // We'll either start immediately, or if given a parent process only when it completes.
        if (parent) {
            parent.completed.then(() => this.start());
        }
        else {
            this.start();
        }
    }
    get hasStarted() { return this.process !== undefined; }
    start() {
        if (this.process)
            throw new Error(`${this.processNumber} Can't start an already started process!`);
        if (this.isCancelled) {
            this.completer.resolve(null);
            return;
        }
        this.process = this.spawn();
        this.process.on("close", (code) => this.completer.resolve(code));
    }
    cancel() {
        this.isCancelled = true;
    }
}
ChainedProcess.processNumber = 1;
//# sourceMappingURL=sdk.js.map