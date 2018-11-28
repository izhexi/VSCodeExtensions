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
const vs = require("vscode");
const config_1 = require("../config");
const log_1 = require("../utils/log");
const emulatorNameRegex = new RegExp("^[a-z][a-z0-9_]*$");
class FlutterDeviceManager {
    constructor(daemon) {
        this.daemon = daemon;
        this.subscriptions = [];
        this.devices = [];
        this.currentDevice = null;
        this.statusBarItem = vs.window.createStatusBarItem(vs.StatusBarAlignment.Right, 1);
        this.statusBarItem.tooltip = "Flutter";
        this.statusBarItem.show();
        this.updateStatusBar();
        this.subscriptions.push(this.statusBarItem);
        this.subscriptions.push(vs.commands.registerCommand("flutter.selectDevice", this.showDevicePicker, this));
        this.subscriptions.push(vs.commands.registerCommand("flutter.launchEmulator", this.promptForAndLaunchEmulator, this));
        daemon.registerForDeviceAdded(this.deviceAdded.bind(this));
        daemon.registerForDeviceRemoved(this.deviceRemoved.bind(this));
    }
    dispose() {
        this.subscriptions.forEach((s) => s.dispose());
    }
    deviceAdded(dev) {
        this.devices.push(dev);
        if (this.currentDevice == null || config_1.config.flutterSelectDeviceWhenConnected) {
            this.currentDevice = dev;
        }
        this.updateStatusBar();
    }
    deviceRemoved(dev) {
        this.devices = this.devices.filter((d) => d.id !== dev.id);
        if (this.currentDevice.id === dev.id)
            this.currentDevice = this.devices.length === 0 ? null : this.devices[this.devices.length - 1];
        this.updateStatusBar();
    }
    showDevicePicker() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = this.devices
                .sort(this.deviceSortComparer.bind(this))
                .map((d) => ({
                description: d.platform,
                detail: d === this.currentDevice ? "Current Device" : (d.emulator ? "Emulator" : "Physical Device"),
                device: d,
                label: d.name,
            }));
            const d = yield vs.window.showQuickPick(devices, { placeHolder: "Select a device to use" });
            if (d) {
                this.currentDevice = d.device;
                this.updateStatusBar();
            }
        });
    }
    deviceSortComparer(d1, d2) {
        // Always consider current device to be first.
        if (d1 === this.currentDevice)
            return -1;
        if (d2 === this.currentDevice)
            return 1;
        // Otherwise, sort by name.
        return d1.name.localeCompare(d2.name);
    }
    updateStatusBar() {
        if (this.currentDevice)
            this.statusBarItem.text = `${this.currentDevice.name} (${this.currentDevice.platform}${this.currentDevice.emulator ? " Emulator" : ""})`;
        else
            this.statusBarItem.text = "No Devices";
        // Don't show the progress bar until we're ready (eg. we may have kicked off a Dart download).
        if (!this.daemon.isReady) {
            this.statusBarItem.hide();
        }
        else {
            this.statusBarItem.show();
        }
        if (this.devices.length > 1) {
            this.statusBarItem.tooltip = `${this.devices.length} Devices Connected`;
            this.statusBarItem.command = "flutter.selectDevice";
        }
        else if (this.devices.length === 1) {
            this.statusBarItem.tooltip = undefined;
            this.statusBarItem.command = undefined;
        }
        else {
            this.statusBarItem.tooltip = undefined;
            this.statusBarItem.command = "flutter.launchEmulator";
        }
    }
    getEmulators() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emus = yield this.daemon.getEmulators();
                return emus.map((e) => ({
                    id: e.id,
                    name: e.name || e.id,
                }));
            }
            catch (e) {
                log_1.logError({ message: e });
                return [];
            }
        });
    }
    promptForAndLaunchEmulator(allowAutomaticSelection = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const emulators = (yield this.getEmulators())
                .map((e) => ({
                description: e.id,
                emulator: e,
                isCreateEntry: false,
                label: e.name,
            }));
            // Because the above call is async, it's possible a device was connected while we were calling. If so,
            // just use that instead of showing the prompt.
            if (allowAutomaticSelection && this.currentDevice)
                return true;
            // Add an option to create a new emulator if the daemon supports it.
            if (this.daemon.capabilities.canCreateEmulators) {
                emulators.push({
                    description: "Creates and launches a new Android emulator",
                    emulator: undefined,
                    isCreateEntry: true,
                    label: "Create New",
                });
            }
            if (emulators.length === 0) {
                return false;
            }
            const cancellationTokenSource = new vs.CancellationTokenSource();
            const waitingForRealDeviceSubscription = this.daemon.registerForDeviceAdded(() => {
                cancellationTokenSource.cancel();
                waitingForRealDeviceSubscription.dispose();
            });
            const selectedEmulator = yield vs.window.showQuickPick(emulators, {
                matchOnDescription: true,
                placeHolder: "Connect a device or select an emulator to launch",
            }, cancellationTokenSource.token);
            waitingForRealDeviceSubscription.dispose();
            if (selectedEmulator && selectedEmulator.isCreateEntry) {
                // TODO: Allow user to create names when we let them customise the emulator type.
                // const name = await vs.window.showInputBox({
                // 	prompt: "Enter a name for your new Android Emulator",
                // 	validateInput: this.validateEmulatorName,
                // });
                // if (!name) bail() // Pressing ENTER doesn't work, but escape does, so if
                // no name, user probably wanted to cancel
                const name = undefined;
                const create = this.daemon.createEmulator(name);
                vs.window.withProgress({
                    location: vs.ProgressLocation.Notification,
                    title: `${`Creating emulator ${name ? name : ""}`.trim()}...`,
                }, (progress) => create);
                const res = yield create;
                if (res.success) {
                    return this.launchEmulator({
                        id: res.emulatorName,
                        name: res.emulatorName,
                    });
                }
                else {
                    vs.window.showErrorMessage(res.error);
                }
            }
            else if (selectedEmulator) {
                return this.launchEmulator(selectedEmulator.emulator);
            }
            else {
                return !!this.currentDevice;
            }
        });
    }
    validateEmulatorName(input) {
        if (!emulatorNameRegex.test(input))
            return "Emulator names should contain only letters, numbers, dots, underscores and dashes";
    }
    launchEmulator(emulator) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield vs.window.withProgress({
                    location: vs.ProgressLocation.Notification,
                    title: `Launching ${emulator.name}...`,
                }, (progress) => __awaiter(this, void 0, void 0, function* () {
                    yield this.daemon.launchEmulator(emulator.id);
                    progress.report({ message: `Waiting for ${emulator.name} to connect...` });
                    // Wait up to 60 seconds for emulator to launch.
                    for (let i = 0; i < 120; i++) {
                        yield new Promise((resolve) => setTimeout(resolve, 500));
                        if (this.currentDevice)
                            return;
                    }
                    throw new Error("Emulator didn't connected within 60 seconds");
                }));
            }
            catch (e) {
                vs.window.showErrorMessage(`Failed to launch emulator: ${e}`);
                return false;
            }
            // Wait an additional second to try and void some possible races.
            yield new Promise((resolve) => setTimeout(resolve, 1000));
            return true;
        });
    }
}
exports.FlutterDeviceManager = FlutterDeviceManager;
//# sourceMappingURL=device_manager.js.map