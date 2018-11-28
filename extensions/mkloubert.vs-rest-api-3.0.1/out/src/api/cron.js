"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
// [DELETE] /api/cron(/{name})
function DELETE(args) {
    let canActivate = args.request.user.can('activate');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canActivate) {
            args.sendForbidden();
            completed();
            return;
        }
        getJobs().then((jobs) => {
            if (false === jobs) {
                args.sendResponse(410); // 'vs-cron' is NOT installed
                completed();
                return;
            }
            let jobName;
            if (args.endpoint.arguments.length > 0) {
                jobName = rapi_helpers.normalizeString(args.endpoint.arguments[0]);
            }
            let filterJobs = (j) => {
                return (j || jobs).filter(x => rapi_helpers.normalizeString(x.name) == jobName ||
                    !jobName);
            };
            let machtingJobs = filterJobs();
            if (!jobName || machtingJobs.length > 0) {
                vscode.commands.getCommands(true).then((commands) => {
                    let stopJobsCmd = commands.filter(x => 'extension.cronJons.stopJobsByName' == x);
                    if (stopJobsCmd.length < 1) {
                        completed(null, false);
                        return;
                    }
                    vscode.commands.executeCommand(stopJobsCmd[0], machtingJobs.map(x => x.name)).then(() => {
                        getJobs().then((upToDateJobs) => {
                            if (false !== upToDateJobs) {
                                upToDateJobs = upToDateJobs.filter(utdj => machtingJobs.map(mj => rapi_helpers.normalizeString(mj.name))
                                    .indexOf(rapi_helpers.normalizeString(utdj.name)) > -1);
                                args.response.data = filterJobs(upToDateJobs).map(x => jobInfoToObject(x));
                            }
                            completed();
                        }, (err) => {
                            completed(err);
                        });
                    }, (err) => {
                        completed(err);
                    });
                });
            }
            else {
                // not found
                args.sendNotFound();
                completed();
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.DELETE = DELETE;
// [GET] /api/cron
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        getJobs().then((jobs) => {
            if (false === jobs) {
                args.sendResponse(410); // 'vs-cron' is NOT installed
            }
            else {
                args.response.data = jobs.map(x => jobInfoToObject(x));
            }
            completed();
        }, (err) => {
            completed(err);
        });
    });
}
exports.GET = GET;
function getJobs() {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        try {
            vscode.commands.getCommands(true).then((commands) => {
                let getJobsCmd = commands.filter(x => 'extension.cronJons.getJobs' == x);
                if (getJobsCmd.length < 1) {
                    completed(null, false);
                    return;
                }
                try {
                    let callback = (err, jobs) => {
                        if (!err) {
                            jobs = (jobs || []).filter(x => x);
                        }
                        completed(err, jobs);
                    };
                    vscode.commands.executeCommand(getJobsCmd[0], callback).then(() => {
                        //TODO
                    }, (err) => {
                        completed(err);
                    });
                }
                catch (e) {
                    completed(e);
                }
            }, (err) => {
                completed(err);
            });
        }
        catch (e) {
            completed(e);
        }
    });
}
function jobInfoToObject(job) {
    let obj;
    if (job) {
        obj = {
            description: rapi_helpers.isEmptyString(job.description) ? undefined : rapi_helpers.toStringSafe(job.description),
            detail: rapi_helpers.isEmptyString(job.detail) ? undefined : rapi_helpers.toStringSafe(job.detail),
            isRunning: rapi_helpers.toBooleanSafe(job.isRunning),
            lastExecution: rapi_helpers.isEmptyString(job.lastExecution) ? undefined : rapi_helpers.toStringSafe(job.lastExecution),
            name: rapi_helpers.isEmptyString(job.name) ? undefined : rapi_helpers.toStringSafe(job.name),
            path: '/api/cron/' + encodeURIComponent(rapi_helpers.toStringSafe(job.name)),
        };
    }
    return obj;
}
// [POST] /api/cron(/{name})
function POST(args) {
    let canActivate = args.request.user.can('activate');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canActivate) {
            args.sendForbidden();
            completed();
            return;
        }
        getJobs().then((jobs) => {
            if (false === jobs) {
                args.sendResponse(410); // 'vs-cron' is NOT installed
                completed();
                return;
            }
            let jobName;
            if (args.endpoint.arguments.length > 0) {
                jobName = rapi_helpers.normalizeString(args.endpoint.arguments[0]);
            }
            let filterJobs = (j) => {
                return (j || jobs).filter(x => rapi_helpers.normalizeString(x.name) == jobName ||
                    !jobName);
            };
            let machtingJobs = filterJobs();
            if (!jobName || machtingJobs.length > 0) {
                if (jobName && machtingJobs.filter(x => x.isRunning).length > 0) {
                    // at least one job is running
                    args.sendResponse(409);
                    completed();
                    return;
                }
                vscode.commands.getCommands(true).then((commands) => {
                    let startJobsCmd = commands.filter(x => 'extension.cronJons.startJobsByName' == x);
                    if (startJobsCmd.length < 1) {
                        completed(null, false);
                        return;
                    }
                    vscode.commands.executeCommand(startJobsCmd[0], machtingJobs.map(x => x.name)).then(() => {
                        getJobs().then((upToDateJobs) => {
                            if (false !== upToDateJobs) {
                                upToDateJobs = upToDateJobs.filter(utdj => machtingJobs.map(mj => rapi_helpers.normalizeString(mj.name))
                                    .indexOf(rapi_helpers.normalizeString(utdj.name)) > -1);
                                args.response.data = filterJobs(upToDateJobs).map(x => jobInfoToObject(x));
                            }
                            completed();
                        }, (err) => {
                            completed(err);
                        });
                    }, (err) => {
                        completed(err);
                    });
                });
            }
            else {
                // not found
                args.sendNotFound();
                completed();
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.POST = POST;
// [PUT] /api/cron(/{name})
function PUT(args) {
    let canActivate = args.request.user.can('activate');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canActivate) {
            args.sendForbidden();
            completed();
            return;
        }
        getJobs().then((jobs) => {
            if (false === jobs) {
                args.sendResponse(410); // 'vs-cron' is NOT installed
                completed();
                return;
            }
            let jobName;
            if (args.endpoint.arguments.length > 0) {
                jobName = rapi_helpers.normalizeString(args.endpoint.arguments[0]);
            }
            let filterJobs = (j) => {
                return (j || jobs).filter(x => rapi_helpers.normalizeString(x.name) == jobName ||
                    !jobName);
            };
            let machtingJobs = filterJobs();
            if (!jobName || machtingJobs.length > 0) {
                vscode.commands.getCommands(true).then((commands) => {
                    let restartJobsCmd = commands.filter(x => 'extension.cronJons.restartJobsByName' == x);
                    if (restartJobsCmd.length < 1) {
                        completed(null, false);
                        return;
                    }
                    vscode.commands.executeCommand(restartJobsCmd[0], machtingJobs.map(x => x.name)).then(() => {
                        getJobs().then((upToDateJobs) => {
                            if (false !== upToDateJobs) {
                                upToDateJobs = upToDateJobs.filter(utdj => machtingJobs.map(mj => rapi_helpers.normalizeString(mj.name))
                                    .indexOf(rapi_helpers.normalizeString(utdj.name)) > -1);
                                args.response.data = filterJobs(upToDateJobs).map(x => jobInfoToObject(x));
                            }
                            completed();
                        }, (err) => {
                            completed(err);
                        });
                    }, (err) => {
                        completed(err);
                    });
                });
            }
            else {
                // not found
                args.sendNotFound();
                completed();
            }
        }, (err) => {
            completed(err);
        });
    });
}
exports.PUT = PUT;
//# sourceMappingURL=cron.js.map