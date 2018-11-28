"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const path = require("path");
const vs = require("vscode");
const channels_1 = require("../commands/channels");
const extension_1 = require("../extension");
const utils_1 = require("../utils");
const test_1 = require("../utils/test");
const DART_TEST_SUITE_NODE = "dart-code:testSuiteNode";
const DART_TEST_GROUP_NODE = "dart-code:testGroupNode";
const DART_TEST_TEST_NODE = "dart-code:testTestNode";
// TODO: Refactor all of this crazy logic out of test_view into its own class, so that consuming the test results is much
// simpler and disconnected from the view!
const suites = {};
class TestResultsProvider {
    constructor() {
        this.disposables = [];
        this.onDidChangeTreeDataEmitter = new vs.EventEmitter();
        this.onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
        this.onDidStartTestsEmitter = new vs.EventEmitter();
        this.onDidStartTests = this.onDidStartTestsEmitter.event;
        this.onFirstFailureEmitter = new vs.EventEmitter();
        this.onFirstFailure = this.onFirstFailureEmitter.event;
        this.owningDebugSessions = {};
        this.disposables.push(vs.debug.onDidReceiveDebugSessionCustomEvent((e) => this.handleDebugSessionCustomEvent(e)));
        this.disposables.push(vs.debug.onDidTerminateDebugSession((session) => this.handleDebugSessionEnd(session)));
        this.disposables.push(vs.commands.registerCommand("dart.startDebuggingTest", (treeNode) => {
            vs.debug.startDebugging(vs.workspace.getWorkspaceFolder(treeNode.resourceUri), test_1.getLaunchConfig(false, utils_1.fsPath(treeNode.resourceUri), treeNode instanceof TestTreeItem ? treeNode.test.name : treeNode instanceof GroupTreeItem ? treeNode.group.name : undefined, treeNode instanceof GroupTreeItem));
        }));
        this.disposables.push(vs.commands.registerCommand("dart.startWithoutDebuggingTest", (treeNode) => {
            vs.debug.startDebugging(vs.workspace.getWorkspaceFolder(treeNode.resourceUri), test_1.getLaunchConfig(true, utils_1.fsPath(treeNode.resourceUri), treeNode instanceof TestTreeItem ? treeNode.test.name : treeNode instanceof GroupTreeItem ? treeNode.group.name : undefined, treeNode instanceof GroupTreeItem));
        }));
        this.disposables.push(vs.commands.registerCommand("_dart.displaySuite", (treeNode) => {
            return vs.commands.executeCommand("_dart.jumpToLineColInUri", vs.Uri.file(treeNode.suite.path));
        }));
        this.disposables.push(vs.commands.registerCommand("_dart.displayGroup", (treeNode) => {
            return vs.commands.executeCommand("_dart.jumpToLineColInUri", vs.Uri.parse(treeNode.group.url || treeNode.group.root_url), treeNode.group.root_line || treeNode.group.line, treeNode.group.root_column || treeNode.group.column);
        }));
        this.disposables.push(vs.commands.registerCommand("_dart.displayTest", (treeNode) => {
            this.writeTestOutput(treeNode, true);
            return vs.commands.executeCommand("_dart.jumpToLineColInUri", vs.Uri.parse(treeNode.test.root_url || treeNode.test.url), treeNode.test.root_line || treeNode.test.line, treeNode.test.root_column || treeNode.test.column);
        }));
    }
    static flagSuiteStart(suitePath, isRunningWholeSuite) {
        TestResultsProvider.isNewTestRun = true;
        TestResultsProvider.nextFailureIsFirst = true;
        // When running the whole suite, we flag all tests as being potentially deleted
        // and then any tests that aren't run are removed from the tree. This is to ensure
        // if a test is renamed, we don't keep the old version of it in the test tree forever
        // since we don't have the necessary information to know the test was renamed.
        if (isRunningWholeSuite && suitePath && path.isAbsolute(suitePath)) {
            const suite = suites[utils_1.fsPath(suitePath)];
            if (suite) {
                suite.getAllGroups().forEach((g) => g.isPotentiallyDeleted = true);
                suite.getAllTests().forEach((t) => t.isPotentiallyDeleted = true);
            }
        }
        // Mark all tests everywhere as "stale" which will make them faded, so that results from
        // the "new" run are more obvious in the tree.
        // All increase the currentRunNumber to ensure we know all results are from
        // the newest run.
        Object.keys(suites).forEach((p) => {
            const suite = suites[utils_1.fsPath(p)];
            suite.currentRunNumber++;
            suite.getAllGroups().forEach((g) => g.isStale = true);
            suite.getAllTests().forEach((t) => t.isStale = true);
        });
    }
    setSelectedNodes(item) {
        this.currentSelectedNode = item;
    }
    writeTestOutput(treeNode, forceShow = false) {
        const output = channels_1.getChannel("Test Output");
        output.clear();
        if (forceShow)
            output.show(true);
        output.appendLine(`${treeNode.test.name}:\n`);
        if (!treeNode.outputEvents.length)
            output.appendLine(`(no output)`);
        for (const o of treeNode.outputEvents) {
            this.appendTestOutput(o, output);
        }
    }
    appendTestOutput(event, output = channels_1.getChannel("Test Output")) {
        if (event.type === "error") {
            event = event;
            output.appendLine(`ERROR: ${event.error}`);
            output.appendLine(event.stackTrace);
        }
        else if (event.type === "print") {
            event = event;
            output.appendLine(event.message);
        }
        else {
            output.appendLine(`Unknown message type '${event.type}'.`);
        }
    }
    handleDebugSessionCustomEvent(e) {
        if (e.event === "dart.testRunNotification") {
            // If we're starting a suite, record us as the owner so we can clean up later
            if (e.body.notification.type === "suite")
                this.owningDebugSessions[e.body.suitePath] = e.session;
            this.handleNotification(e.body.suitePath, e.body.notification);
        }
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        let items = !element
            ? Object.keys(suites).map((k) => suites[k].node)
            : (element instanceof SuiteTreeItem || element instanceof GroupTreeItem)
                ? element.children
                : [];
        items = items.filter((item) => item);
        // Only sort suites, as tests may have a useful order themselves.
        if (!element) {
            items = _.sortBy(items, [
                (t) => t.sort,
                (t) => t.label,
            ]);
        }
        return items;
    }
    getParent(element) {
        if (element instanceof TestTreeItem || element instanceof GroupTreeItem)
            return element.parent;
    }
    updateNode(node) {
        this.onDidChangeTreeDataEmitter.fire(node);
    }
    updateAllStatuses(suite) {
        // Walk the tree to get the status.
        this.updateStatusFromChildren(suite.node);
        // Update top level list, as we could've changed order.
        this.updateNode();
    }
    updateStatusFromChildren(node) {
        const childStatuses = node.children.length
            ? node.children.filter((c) => (c instanceof GroupTreeItem && !c.isPhantomGroup)
                || (c instanceof TestTreeItem && !c.hidden)).map((c) => {
                if (c instanceof GroupTreeItem)
                    return this.updateStatusFromChildren(c);
                if (c instanceof TestTreeItem)
                    return c.status;
                return TestStatus.Unknown;
            })
            : [TestStatus.Unknown];
        const newStatus = Math.max.apply(Math, childStatuses);
        if (newStatus !== node.status) {
            node.status = newStatus;
            node.iconPath = getIconPath(node.status, false);
            this.updateNode(node);
        }
        return node.status;
    }
    dispose() {
        this.disposables.forEach((d) => d.dispose());
    }
    handleNotification(suitePath, evt) {
        const suite = suites[suitePath];
        switch (evt.type) {
            // We won't get notifications that aren't directly tied to Suites because
            // of how the DA works.
            // case "start":
            // 	this.handleStartNotification(evt as StartNotification);
            // 	break;
            // We won't get notifications that aren't directly tied to Suites because
            // of how the DA works.
            // case "allSuites":
            // 	this.handleAllSuitesNotification(evt as AllSuitesNotification);
            // 	break;
            case "suite":
                this.handleSuiteNotification(suitePath, evt);
                break;
            case "testStart":
                this.handleTestStartNotifcation(suite, evt);
                break;
            case "testDone":
                this.handleTestDoneNotification(suite, evt);
                break;
            case "group":
                this.handleGroupNotification(suite, evt);
                break;
            // We won't get notifications that aren't directly tied to Suites because
            // of how the DA works.
            // case "done":
            // 	this.handleDoneNotification(suite, evt as DoneNotification);
            // 	break;
            case "print":
                this.handlePrintNotification(suite, evt);
                break;
            case "error":
                this.handleErrorNotification(suite, evt);
                break;
        }
    }
    handleSuiteNotification(suitePath, evt) {
        let suite = suites[evt.suite.path];
        if (!suite) {
            suite = new SuiteData(suitePath, new SuiteTreeItem(evt.suite));
            suites[evt.suite.path] = suite;
        }
        suite.node.status = TestStatus.Waiting;
        this.updateNode(suite.node);
        this.updateNode();
        // If this is the first suite, we've started a run and can show the tree.
        // We need to wait for the tree node to have been rendered though so setTimeout :(
        if (TestResultsProvider.isNewTestRun) {
            TestResultsProvider.isNewTestRun = false;
            this.onDidStartTestsEmitter.fire(suite.node);
        }
    }
    handleTestStartNotifcation(suite, evt) {
        let oldParent;
        const existingTest = suite.getCurrentTest(evt.test.id) || suite.reuseMatchingTest(suite.currentRunNumber, evt.test, (parent) => oldParent = parent);
        const testNode = existingTest || new TestTreeItem(suite, evt.test);
        if (!existingTest)
            suite.storeTest(evt.test.id, testNode);
        testNode.test = evt.test;
        // If this is a "loading" test then mark it as hidden because it looks wonky in
        // the tree with a full path and we already have the "running" icon on the suite.
        if (testNode.test.name && testNode.test.name.startsWith("loading ") && testNode.parent instanceof SuiteTreeItem)
            testNode.hidden = true;
        else
            testNode.hidden = false;
        // Remove from old parent if required.
        const hasChangedParent = oldParent && oldParent !== testNode.parent;
        if (hasChangedParent) {
            oldParent.tests.splice(oldParent.tests.indexOf(testNode), 1);
            this.updateNode(oldParent);
        }
        // Push to new parent if required.
        if (!existingTest || hasChangedParent)
            testNode.parent.tests.push(testNode);
        testNode.status = TestStatus.Running;
        this.updateNode(testNode);
        this.updateNode(testNode.parent);
        if (!testNode.hidden)
            this.updateAllStatuses(suite);
    }
    handleTestDoneNotification(suite, evt) {
        const testNode = suite.getCurrentTest(evt.testID);
        testNode.hidden = evt.hidden;
        if (evt.skipped) {
            testNode.status = TestStatus.Skipped;
        }
        else if (evt.result === "success") {
            testNode.status = TestStatus.Passed;
        }
        else if (evt.result === "failure") {
            testNode.status = TestStatus.Failed;
        }
        else if (evt.result === "error")
            testNode.status = TestStatus.Errored;
        else {
            testNode.status = TestStatus.Unknown;
        }
        this.updateNode(testNode);
        this.updateNode(testNode.parent);
        this.updateAllStatuses(suite);
        if (testNode.status === TestStatus.Failed && TestResultsProvider.nextFailureIsFirst) {
            TestResultsProvider.nextFailureIsFirst = false;
            this.onFirstFailureEmitter.fire(suite.node);
        }
    }
    handleGroupNotification(suite, evt) {
        let oldParent;
        const existingGroup = suite.getCurrentGroup(evt.group.id) || suite.reuseMatchingGroup(suite.currentRunNumber, evt.group, (parent) => oldParent = parent);
        const groupNode = existingGroup || new GroupTreeItem(suite, evt.group);
        if (!existingGroup)
            suite.storeGroup(evt.group.id, groupNode);
        groupNode.group = evt.group;
        // Remove from old parent if required
        const hasChangedParent = oldParent && oldParent !== groupNode.parent;
        if (hasChangedParent) {
            oldParent.groups.splice(oldParent.groups.indexOf(groupNode), 1);
            this.updateNode(oldParent);
        }
        // Push to new parent if required.
        if (!existingGroup || hasChangedParent)
            groupNode.parent.groups.push(groupNode);
        groupNode.status = TestStatus.Running;
        this.updateNode(groupNode);
        this.updateNode(groupNode.parent);
    }
    handleDebugSessionEnd(session) {
        // Get the suite paths that have us as the owning debug session.
        const suitePaths = Object.keys(this.owningDebugSessions).filter((suitePath) => {
            return this.owningDebugSessions[suitePath] && session
                && this.owningDebugSessions[suitePath].id === session.id;
        });
        // End them all and remove from the lookup.
        for (const suitePath of suitePaths) {
            this.handleSuiteEnd(suites[suitePath]);
            this.owningDebugSessions[suitePath] = undefined;
            delete this.owningDebugSessions[suitePath];
        }
    }
    handleSuiteEnd(suite) {
        if (!suite)
            return;
        // TODO: Some notification that things are complete?
        // TODO: Maybe a progress bar during the run?
        // Hide nodes that were marked as potentially deleted and then never updated.
        // This means they weren't run in the last run, so probably were deleted (or
        // renamed and got new nodes, which still means the old ones should be removed).
        suite.getAllTests(true).filter((t) => t.isPotentiallyDeleted || t.hidden).forEach((t) => {
            t.hidden = true;
            this.updateNode(t.parent);
        });
        // Anything marked as running should be set back to Unknown
        suite.getAllTests().filter((t) => t.status === TestStatus.Running).forEach((t) => {
            t.status = TestStatus.Unknown;
            this.updateNode(t);
        });
        this.updateAllStatuses(suite);
    }
    handlePrintNotification(suite, evt) {
        const test = suite.getCurrentTest(evt.testID);
        test.outputEvents.push(evt);
        if (test === this.currentSelectedNode)
            this.appendTestOutput(evt);
    }
    handleErrorNotification(suite, evt) {
        const test = suite.getCurrentTest(evt.testID);
        test.outputEvents.push(evt);
        if (test === this.currentSelectedNode)
            this.appendTestOutput(evt);
    }
}
// Set this flag we know when a new run starts so we can show the tree; however
// we can't show it until we render a node (we can only call reveal on a node) so
// we need to delay this until the suite starts.
TestResultsProvider.isNewTestRun = true;
TestResultsProvider.nextFailureIsFirst = true;
exports.TestResultsProvider = TestResultsProvider;
class SuiteData {
    constructor(path, node) {
        this.path = path;
        this.node = node;
        // To avoid collissions in IDs across runs, we increment this number on every
        // run of this suite and then use it as a prefix when looking up IDs. This allows
        // older (stale) results not to be looked up when using IDs.
        this.currentRunNumber = 1;
        this.groups = {};
        this.tests = {};
    }
    getAllGroups(includeHidden = false) {
        // Have to unique these, as we keep dupes in the lookup with the "old" IDs
        // so that stale nodes can still look up their parents.
        return _.uniq(Object.keys(this.groups)
            .map((gKey) => this.groups[gKey])
            .filter((g) => includeHidden || (!g.hidden && !g.isPhantomGroup)));
    }
    getAllTests(includeHidden = false) {
        // Have to unique these, as we keep dupes in the lookup with the "old" IDs
        // so that stale nodes can still look up their parents.
        return _.uniq(Object.keys(this.tests)
            .map((tKey) => this.tests[tKey])
            .filter((t) => includeHidden || !t.hidden));
    }
    getCurrentGroup(id) {
        return this.groups[`${this.currentRunNumber}_${id}`];
    }
    getCurrentTest(id) {
        return this.tests[`${this.currentRunNumber}_${id}`];
    }
    getMyGroup(suiteRunNumber, id) {
        return this.groups[`${suiteRunNumber}_${id}`];
    }
    getMyTest(suiteRunNumber, id) {
        return this.tests[`${suiteRunNumber}_${id}`];
    }
    storeGroup(id, node) {
        return this.groups[`${this.currentRunNumber}_${id}`] = node;
    }
    storeTest(id, node) {
        return this.tests[`${this.currentRunNumber}_${id}`] = node;
    }
    reuseMatchingGroup(currentSuiteRunNumber, group, handleOldParent) {
        // To reuse a node, the name must match and it must have not been used for the current run.
        const matches = this.getAllGroups().filter((g) => {
            return g.group.name === group.name
                && g.suiteRunNumber !== currentSuiteRunNumber;
        });
        // Reuse the one nearest to the source position.
        const sortedMatches = _.sortBy(matches, (g) => Math.abs(g.group.line - group.line));
        const match = sortedMatches.length ? sortedMatches[0] : undefined;
        if (match) {
            handleOldParent(match.parent);
            match.suiteRunNumber = this.currentRunNumber;
            this.storeGroup(group.id, match);
        }
        return match;
    }
    reuseMatchingTest(currentSuiteRunNumber, test, handleOldParent) {
        // To reuse a node, the name must match and it must have not been used for the current run.
        const matches = this.getAllTests().filter((t) => {
            return t.test.name === test.name
                && t.suiteRunNumber !== currentSuiteRunNumber;
        });
        // Reuse the one nearest to the source position.
        const sortedMatches = _.sortBy(matches, (t) => Math.abs(t.test.line - test.line));
        const match = sortedMatches.length ? sortedMatches[0] : undefined;
        if (match) {
            handleOldParent(match.parent);
            match.suiteRunNumber = this.currentRunNumber;
            this.storeTest(test.id, match);
        }
        return match;
    }
}
class TestItemTreeItem extends vs.TreeItem {
    constructor() {
        super(...arguments);
        this._isStale = false; // tslint:disable-line:variable-name
        this._status = TestStatus.Unknown; // tslint:disable-line:variable-name
        // To avoid the sort changing on every status change (stale, running, etc.) this
        // field will be the last status the user would care about (pass/fail/skip).
        // Default to Passed just so things default to the most likely (hopefully) place. This should
        // never be used for rendering; only sorting.
        this._sort = TestSortOrder.Middle; // tslint:disable-line:variable-name
        this.suiteRunNumber = 0;
        this.isPotentiallyDeleted = false;
    }
    get status() {
        return this._status;
    }
    set status(status) {
        this._status = status;
        this.iconPath = getIconPath(status, this.isStale);
        if (status === TestStatus.Errored || status === TestStatus.Failed
            || status === TestStatus.Passed
            || status === TestStatus.Skipped) {
            this.isStale = false;
            this.isPotentiallyDeleted = false;
            this._sort = getTestSortOrder(status);
        }
    }
    get isStale() {
        return this._isStale;
    }
    set isStale(isStale) {
        this._isStale = isStale;
        this.iconPath = getIconPath(this.status, this.isStale);
    }
    get sort() {
        return this._sort;
    }
}
class SuiteTreeItem extends TestItemTreeItem {
    constructor(suite) {
        super(vs.Uri.file(suite.path), vs.TreeItemCollapsibleState.Collapsed);
        this.groups = [];
        this.tests = [];
        this.suite = suite;
        this.contextValue = DART_TEST_SUITE_NODE;
        this.resourceUri = vs.Uri.file(suite.path);
        this.id = `suite_${this.suite.path}_${this.suiteRunNumber}_${this.suite.id}`;
        this.status = TestStatus.Unknown;
        this.command = { command: "_dart.displaySuite", arguments: [this], title: "" };
    }
    getLabel(file) {
        const ws = vs.workspace.getWorkspaceFolder(vs.Uri.file(file));
        if (!ws)
            return path.basename(file);
        const rel = path.relative(utils_1.fsPath(ws.uri), file);
        return rel.startsWith(`test${path.sep}`)
            ? rel.substr(5)
            : rel;
    }
    get children() {
        // Children should be:
        // 1. All children of any of our phantom groups
        // 2. Our children excluding our phantom groups
        return []
            .concat(_.flatMap(this.groups.filter((g) => g.isPhantomGroup), (g) => g.children))
            .concat(this.groups.filter((g) => !g.isPhantomGroup && !g.hidden))
            .concat(this.tests.filter((t) => !t.hidden));
    }
    get suite() {
        return this._suite;
    }
    set suite(suite) {
        this._suite = suite;
        this.label = this.getLabel(suite.path);
    }
}
exports.SuiteTreeItem = SuiteTreeItem;
class GroupTreeItem extends TestItemTreeItem {
    constructor(suite, group) {
        super(group.name, vs.TreeItemCollapsibleState.Collapsed);
        this.suite = suite;
        this.groups = [];
        this.tests = [];
        this.suiteRunNumber = suite.currentRunNumber;
        this.group = group;
        this.contextValue = DART_TEST_GROUP_NODE;
        this.resourceUri = vs.Uri.file(suite.path);
        this.id = `suite_${this.suite.path}_${this.suiteRunNumber}_group_${this.group.id}`;
        this.status = TestStatus.Unknown;
        this.command = { command: "_dart.displayGroup", arguments: [this], title: "" };
    }
    get isPhantomGroup() {
        return !this.group.name && this.parent instanceof SuiteTreeItem;
    }
    get hidden() {
        // If every child is hidden, we are hidden.
        return this.children.every((c) => {
            return (c instanceof GroupTreeItem && c.hidden)
                || (c instanceof TestTreeItem && c.hidden);
        });
    }
    get parent() {
        const parent = this.group.parentID
            ? this.suite.getMyGroup(this.suiteRunNumber, this.group.parentID)
            : this.suite.node;
        // If our parent is a phantom group at the top level, then just bounce over it.
        if (parent instanceof GroupTreeItem && parent.isPhantomGroup)
            return parent.parent;
        return parent;
    }
    get children() {
        return []
            .concat(this.groups.filter((t) => !t.hidden))
            .concat(this.tests.filter((t) => !t.hidden));
    }
    get group() {
        return this._group;
    }
    set group(group) {
        this._group = group;
        const parent = this.parent;
        this.label = parent && parent instanceof GroupTreeItem && parent.fullName && group.name.startsWith(`${parent.fullName} `)
            ? group.name.substr(parent.fullName.length + 1) // +1 because of the space (included above).
            : group.name;
    }
    get fullName() {
        return this._group.name;
    }
}
class TestTreeItem extends TestItemTreeItem {
    constructor(suite, test, hidden = false) {
        super(test.name, vs.TreeItemCollapsibleState.None);
        this.suite = suite;
        this.hidden = hidden;
        this.outputEvents = [];
        this.suiteRunNumber = suite.currentRunNumber;
        this.test = test;
        this.contextValue = DART_TEST_TEST_NODE;
        this.resourceUri = vs.Uri.file(suite.path);
        this.id = `suite_${this.suite.path}_${this.suiteRunNumber}_test_${this.test.id}`;
        this.status = TestStatus.Unknown;
        this.command = { command: "_dart.displayTest", arguments: [this], title: "" };
    }
    get parent() {
        const parent = this.test.groupIDs && this.test.groupIDs.length
            ? this.suite.getMyGroup(this.suiteRunNumber, this.test.groupIDs[this.test.groupIDs.length - 1])
            : this.suite.node;
        // If our parent is a phantom group at the top level, then just bounce over it.
        if (parent instanceof GroupTreeItem && parent.isPhantomGroup)
            return parent.parent;
        return parent;
    }
    get test() {
        return this._test;
    }
    set test(test) {
        this._test = test;
        this.outputEvents.length = 0;
        // Update the label.
        const parent = this.parent;
        this.label = parent && parent instanceof GroupTreeItem && parent.fullName && test.name.startsWith(`${parent.fullName} `)
            ? test.name.substr(parent.fullName.length + 1) // +1 because of the space (included above).
            : test.name;
    }
    get fullName() {
        return this._test.name;
    }
}
function getIconPath(status, isStale) {
    let file;
    // TODO: Should we have faded icons for stale versions?
    switch (status) {
        case TestStatus.Running:
            file = "running";
            break;
        case TestStatus.Passed:
            file = isStale ? "pass_stale" : "pass";
            break;
        case TestStatus.Failed:
        case TestStatus.Errored:
            file = isStale ? "fail_stale" : "fail";
            break;
        case TestStatus.Skipped:
            file = isStale ? "skip_stale" : "skip";
            break;
        case TestStatus.Unknown:
            file = "unknown";
            break;
        case TestStatus.Waiting:
            file = "loading";
            break;
        default:
            file = undefined;
    }
    return file && extension_1.extensionPath
        ? vs.Uri.file(path.join(extension_1.extensionPath, `media/icons/tests/${file}.svg`))
        : undefined;
}
var TestStatus;
(function (TestStatus) {
    // This should be in order such that the highest number is the one to show
    // when aggregating (eg. from children).
    TestStatus[TestStatus["Waiting"] = 0] = "Waiting";
    TestStatus[TestStatus["Passed"] = 1] = "Passed";
    TestStatus[TestStatus["Skipped"] = 2] = "Skipped";
    TestStatus[TestStatus["Unknown"] = 3] = "Unknown";
    TestStatus[TestStatus["Failed"] = 4] = "Failed";
    TestStatus[TestStatus["Errored"] = 5] = "Errored";
    TestStatus[TestStatus["Running"] = 6] = "Running";
})(TestStatus = exports.TestStatus || (exports.TestStatus = {}));
var TestSortOrder;
(function (TestSortOrder) {
    TestSortOrder[TestSortOrder["Top"] = 0] = "Top";
    TestSortOrder[TestSortOrder["Middle"] = 1] = "Middle";
    TestSortOrder[TestSortOrder["Bottom"] = 2] = "Bottom";
})(TestSortOrder || (TestSortOrder = {}));
function getTestSortOrder(status) {
    if (status === TestStatus.Failed || status === TestStatus.Errored)
        return TestSortOrder.Top;
    // https://github.com/Dart-Code/Dart-Code/issues/1125
    // if (status === TestStatus.Skipped)
    // 	return TestSortOrder.Bottom;
    return TestSortOrder.Middle;
}
//# sourceMappingURL=test_view.js.map