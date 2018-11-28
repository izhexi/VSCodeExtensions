"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("./utils");
const fs_1 = require("./utils/fs");
exports.UPGRADE_TO_WORKSPACE_FOLDERS = "Mark Projects as Workspace Folders";
function locateBestProjectRoot(folder) {
    if (!folder || !util.isWithinWorkspace(folder))
        return undefined;
    let dir = folder;
    while (dir !== path.dirname(dir)) {
        if (fs_1.hasPubspec(dir) || fs_1.hasPackagesFile(dir))
            return dir;
        dir = path.dirname(dir);
    }
    return undefined;
}
exports.locateBestProjectRoot = locateBestProjectRoot;
function getChildProjects(folder, levelsToGo) {
    const children = fs
        .readdirSync(folder)
        .filter((f) => f !== "bin") // Don't look in bin folders
        .filter((f) => f !== "cache") // Don't look in cache folders
        .map((f) => path.join(folder, f))
        .filter((d) => fs.statSync(d).isDirectory());
    let projects = [];
    for (const dir of children) {
        if (fs_1.hasPubspec(dir)) {
            projects.push(dir);
        }
        if (levelsToGo > 0)
            projects = projects.concat(getChildProjects(dir, levelsToGo - 1));
    }
    return projects;
}
//# sourceMappingURL=project.js.map