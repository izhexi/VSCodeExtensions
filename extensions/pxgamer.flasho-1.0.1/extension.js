var vscode = require('vscode');
var path = require('path');
var exec = require('child_process').exec;
var config = vscode.workspace.getConfiguration('flasho');

function activate(context) {
    var disposable = vscode.commands.registerCommand('flasho.Flash', function (contextInfo) {
        var pathName = contextInfo.fsPath;
        var extension = path.extname(pathName);

        if (extension === '.fla') {
            var program_path = (config.os_bit == '64-bit') ? 'Program Files (x86)' : 'Program Files';
            var execCmd = '"C:\\' + program_path + '\\Adobe\\Adobe Flash ' + config.version + '\\Flash.exe" "' + pathName + '"';

            exec(execCmd);

            if (config.notify) {
                vscode.window.showInformationMessage('Opening ' + path.basename(pathName) + ' in Adobe Flash');
            }
        } else {
            if (config.notify) {
                vscode.window.showInformationMessage('Not a valid .fla file.');
            }
        }
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;