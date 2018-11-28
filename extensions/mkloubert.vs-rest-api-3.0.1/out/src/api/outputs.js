"use strict";
/// <reference types="node" />
Object.defineProperty(exports, "__esModule", { value: true });
const rapi_helpers = require("../helpers");
const vscode = require("vscode");
// [DELETE] /outputs/{id}
function DELETE(args) {
    let canDelete = args.request.user.can('delete');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canDelete) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let channel = getChannelById(args);
            if (channel) {
                let outputChannels = args.workspaceState['outputChannels'];
                if (outputChannels) {
                    outputChannels.splice(channel.id, 1);
                }
                channel.channel.dispose();
            }
            else {
                args.sendNotFound();
            }
            completed();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.DELETE = DELETE;
// [GET] /outputs
function GET(args) {
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        try {
            let channels = [
                outputChannelToObject(args.outputChannel),
            ];
            let outputChannels = args.workspaceState['outputChannels'];
            if (outputChannels) {
                outputChannels.filter(x => x).forEach((x, i) => {
                    channels.push(outputChannelToObject(x, i));
                });
            }
            args.response.data = channels;
            completed();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.GET = GET;
function getChannelById(args) {
    let channel;
    let parts = args.path.split('/');
    if (parts.length > 1) {
        let id = parts[1].trim();
        if (rapi_helpers.isEmptyString(id)) {
            channel = {
                channel: args.outputChannel,
            };
        }
        else {
            let idValue = parseInt(id);
            if (!isNaN(idValue)) {
                let outputChannels = args.workspaceState['outputChannels'];
                if (!outputChannels) {
                    outputChannels = [];
                }
                outputChannels = outputChannels.filter(x => x);
                if (idValue >= 0 && idValue < outputChannels.length) {
                    channel = {
                        channel: outputChannels[idValue],
                        id: idValue,
                    };
                }
            }
        }
    }
    return channel;
}
function outputChannelToObject(channel, id) {
    if (!channel) {
        return;
    }
    let obj = {
        name: rapi_helpers.toStringSafe(channel.name),
    };
    if (!rapi_helpers.isEmptyString(id)) {
        obj['id'] = id;
        obj['path'] = '/api/outputs/' + id;
    }
    return obj;
}
// [PATCH] /outputs/{id}
function PATCH(args) {
    let canWrite = args.request.user.can('write');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canWrite) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let channel = getChannelById(args);
            if (channel) {
                rapi_helpers.readHttpBody(args.request.request).then((body) => {
                    try {
                        channel.channel.clear();
                        let str = body.toString('utf8');
                        if (str) {
                            channel.channel.append(str);
                        }
                        args.response.data = outputChannelToObject(channel.channel, channel.id);
                        completed();
                    }
                    catch (e) {
                        completed(e);
                    }
                }, (err) => {
                    completed(err);
                });
            }
            else {
                args.sendNotFound();
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.PATCH = PATCH;
// [POST] /outputs/{name}
function POST(args) {
    let canCreate = args.request.user.can('create');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canCreate) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let channelName;
            {
                let urlPath = rapi_helpers.toStringSafe(args.request.url.pathname).trim();
                let parts = urlPath.split('/');
                if (parts.length > 3) {
                    channelName = decodeURIComponent(parts[3]);
                }
            }
            channelName = rapi_helpers.toStringSafe(channelName).trim();
            let newChannel = vscode.window.createOutputChannel(channelName);
            let outputChannels = args.workspaceState['outputChannels'];
            if (!outputChannels) {
                args.workspaceState['outputChannels'] = [];
            }
            args.workspaceState['outputChannels'].push(newChannel);
            args.response.data = outputChannelToObject(newChannel, args.workspaceState['outputChannels'].length - 1);
            try {
                newChannel.show();
            }
            catch (e) {
                args.response.code = 1; // create, but not shown
            }
            completed();
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.POST = POST;
// [PUT] /outputs/{id}
function PUT(args) {
    let canWrite = args.request.user.can('write');
    return new Promise((resolve, reject) => {
        let completed = rapi_helpers.createSimplePromiseCompletedAction(resolve, reject);
        if (!canWrite) {
            args.sendForbidden();
            completed();
            return;
        }
        try {
            let channel = getChannelById(args);
            if (channel) {
                rapi_helpers.readHttpBody(args.request.request).then((body) => {
                    try {
                        let str = body.toString('utf8');
                        if (str) {
                            channel.channel.append(str);
                        }
                        args.response.data = outputChannelToObject(channel.channel, channel.id);
                        completed();
                    }
                    catch (e) {
                        completed(e);
                    }
                }, (err) => {
                    completed(err);
                });
            }
            else {
                args.sendNotFound();
                completed();
            }
        }
        catch (e) {
            completed(e);
        }
    });
}
exports.PUT = PUT;
//# sourceMappingURL=outputs.js.map