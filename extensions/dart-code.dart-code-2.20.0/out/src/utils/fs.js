"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function getChildFolders(parent) {
    return fs.readdirSync(parent)
        .map((item) => path.join(parent, item))
        .filter((item) => fs.statSync(item).isDirectory());
}
exports.getChildFolders = getChildFolders;
function hasPackagesFile(folder) {
    return fs.existsSync(path.join(folder, ".packages"));
}
exports.hasPackagesFile = hasPackagesFile;
function hasPubspec(folder) {
    return fs.existsSync(path.join(folder, "pubspec.yaml"));
}
exports.hasPubspec = hasPubspec;
//# sourceMappingURL=fs.js.map