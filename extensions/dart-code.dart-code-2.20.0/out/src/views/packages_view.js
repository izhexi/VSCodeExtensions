"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vs = require("vscode");
const package_map_1 = require("../debug/package_map");
const utils_1 = require("../utils");
const DART_HIDE_PACKAGE_TREE = "dart-code:hidePackageTree";
class DartPackagesProvider extends vs.Disposable {
    constructor() {
        super(() => this.disposeWatcher());
        this.onDidChangeTreeDataEmitter = new vs.EventEmitter();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    }
    setWorkspaces(workspaces) {
        this.disposeWatcher();
        this.workspaceRoot = workspaces && workspaces.length === 1 ? utils_1.fsPath(workspaces[0].uri) : undefined;
        this.createWatcher();
        this.refresh();
    }
    disposeWatcher() {
        if (this.watcher) {
            this.watcher.dispose();
            this.watcher = null;
        }
    }
    createWatcher() {
        if (!this.workspaceRoot)
            return;
        this.watcher = vs.workspace.createFileSystemWatcher(new vs.RelativePattern(this.workspaceRoot, ".packages"));
        this.watcher.onDidChange(this.refresh, this);
        this.watcher.onDidCreate(this.refresh, this);
        this.watcher.onDidDelete(this.refresh, this);
    }
    refresh() {
        DartPackagesProvider.showTree();
        this.onDidChangeTreeDataEmitter.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return new Promise((resolve) => {
            if (element) {
                if (!element.collapsibleState && !element.resourceUri) {
                    return resolve([]);
                }
                else {
                    resolve(fs.readdirSync(utils_1.fsPath(element.resourceUri)).map((name) => {
                        const filePath = path.join(utils_1.fsPath(element.resourceUri), name);
                        const stat = fs.statSync(filePath);
                        if (stat.isFile()) {
                            return new PackageDep(name, vs.Uri.file(filePath), vs.TreeItemCollapsibleState.None, {
                                arguments: [vs.Uri.file(filePath)],
                                command: "dart.package.openFile",
                                title: "Open File",
                            });
                        }
                        else if (stat.isDirectory()) {
                            return new PackageDep(name, vs.Uri.file(filePath), vs.TreeItemCollapsibleState.Collapsed);
                        }
                    }));
                }
            }
            else if (this.workspaceRoot) {
                // When we're re-parsing from root, un-hide the tree. It'll be hidden if we find nothing.
                DartPackagesProvider.showTree();
                const packagesPath = package_map_1.PackageMap.findPackagesFile(path.join(this.workspaceRoot, ".packages"));
                if (packagesPath && fs.existsSync(packagesPath)) {
                    resolve(this.getDepsInPackages(new package_map_1.PackageMap(packagesPath)));
                }
                else {
                    DartPackagesProvider.hideTree();
                    return resolve([]);
                }
            }
            else {
                // Hide the tree in the case there's no root.
                DartPackagesProvider.hideTree();
                return resolve([]);
            }
        });
    }
    getDepsInPackages(map) {
        const packages = map.packages;
        const packageNames = Object.keys(packages).sort();
        const deps = packageNames.map((packageName) => {
            const path = packages[packageName];
            if (this.workspaceRoot !== path) {
                return new PackageDep(`${packageName}`, vs.Uri.file(path), vs.TreeItemCollapsibleState.Collapsed);
            }
        }).filter((d) => d);
        // Hide the tree if we had no dependencies to show.
        DartPackagesProvider.setTreeVisible(!!deps && !!deps.length);
        return deps;
    }
    static setTreeVisible(visible) {
        vs.commands.executeCommand("setContext", DART_HIDE_PACKAGE_TREE, !visible);
    }
    static showTree() { this.setTreeVisible(true); }
    static hideTree() { this.setTreeVisible(false); }
}
exports.DartPackagesProvider = DartPackagesProvider;
class PackageDep extends vs.TreeItem {
    constructor(label, resourceUri, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.resourceUri = resourceUri;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.contextValue = "dependency";
    }
}
//# sourceMappingURL=packages_view.js.map