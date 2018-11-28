"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const open_file_tracker_1 = require("../analysis/open_file_tracker");
const log_1 = require("./log");
function findNode(outlines, offset, useReducedRange, kinds) {
    if (!outlines)
        return undefined;
    for (const outline of outlines) {
        const outlineStart = outline.offset;
        const outlineEnd = outline.offset + outline.length;
        // Bail if this node is not spanning us.
        if (outlineStart > offset || outlineEnd < offset)
            continue;
        // Although we use the full code range above so that we can walk into children, when performing a match we want to stop
        // at the end of the element, so we use a reduce range to avoid returning a method for the whole of its body.
        const isInReducedRange = !useReducedRange || !outline.element || !outline.element.location
            || (offset >= outlineStart && offset <= outline.element.location.offset + outline.element.location.length);
        return findNode(outline.children, offset, useReducedRange, kinds)
            || (kinds.indexOf(outline.element.kind) !== -1 && isInReducedRange ? outline : undefined);
    }
}
function findNearestOutlineNode(document, position, useReducedRange = false, kinds = ["CLASS", "METHOD", "GETTER", "SETTER"]) {
    const outline = open_file_tracker_1.OpenFileTracker.getOutlineFor(document.uri);
    return outline && findNode([outline], document.offsetAt(position), useReducedRange, kinds);
}
exports.findNearestOutlineNode = findNearestOutlineNode;
class OutlineVisitor {
    visit(outline) {
        this.visitNode(outline);
    }
    visitChildren(outline) {
        if (outline.children) {
            for (const child of outline.children) {
                this.visit(child);
            }
        }
    }
    visitNode(outline) {
        switch (outline && outline.element && outline.element.kind) {
            case "CLASS":
                this.visitClass(outline);
                break;
            case "CLASS_TYPE_ALIAS":
                this.visitClassTypeAlias(outline);
                break;
            case "COMPILATION_UNIT":
                this.visitCompilationUnit(outline);
                break;
            case "CONSTRUCTOR":
                this.visitConstructor(outline);
                break;
            case "CONSTRUCTOR_INVOCATION":
                this.visitContructorInvocation(outline);
                break;
            case "ENUM":
                this.visitEnum(outline);
                break;
            case "ENUM_CONSTANT":
                this.visitEnumConstant(outline);
                break;
            case "FIELD":
                this.visitField(outline);
                break;
            case "FILE":
                this.visitXXX(outline);
                break;
            case "FUNCTION":
                this.visitFile(outline);
                break;
            case "FUNCTION_INVOCATION":
                this.visitFunctionInvocation(outline);
                break;
            case "FUNCTION_TYPE_ALIAS":
                this.visitFunctionTypeAlias(outline);
                break;
            case "GETTER":
                this.visitGetter(outline);
                break;
            case "LABEL":
                this.visitLabel(outline);
                break;
            case "LIBRARY":
                this.visitLibrary(outline);
                break;
            case "LOCAL_VARIABLE":
                this.visitLocalVariable(outline);
                break;
            case "METHOD":
                this.visitMethod(outline);
                break;
            case "PARAMETER":
                this.visitParameter(outline);
                break;
            case "PREFIX":
                this.visitPrefix(outline);
                break;
            case "SETTER":
                this.visitSetter(outline);
                break;
            case "TOP_LEVEL_VARIABLE":
                this.visitTopLevelVariable(outline);
                break;
            case "TYPE_PARAMETER":
                this.visitTypeParameter(outline);
                break;
            case "UNIT_TEST_GROUP":
                this.visitUnitTestGroup(outline);
                break;
            case "UNIT_TEST_TEST":
                this.visitUnitTestTest(outline);
                break;
            case "UNKNOWN":
                this.visitUnknown(outline);
                break;
            default:
                log_1.logError(`Unknown Outline item! ${outline && outline.element && outline.element.kind}`);
        }
    }
    visitClass(outline) { this.visitChildren(outline); }
    visitClassTypeAlias(outline) { this.visitChildren(outline); }
    visitCompilationUnit(outline) { this.visitChildren(outline); }
    visitConstructor(outline) { this.visitChildren(outline); }
    visitContructorInvocation(outline) { this.visitChildren(outline); }
    visitEnum(outline) { this.visitChildren(outline); }
    visitEnumConstant(outline) { this.visitChildren(outline); }
    visitField(outline) { this.visitChildren(outline); }
    visitXXX(outline) { this.visitChildren(outline); }
    visitFile(outline) { this.visitChildren(outline); }
    visitFunctionInvocation(outline) { this.visitChildren(outline); }
    visitFunctionTypeAlias(outline) { this.visitChildren(outline); }
    visitGetter(outline) { this.visitChildren(outline); }
    visitLabel(outline) { this.visitChildren(outline); }
    visitLibrary(outline) { this.visitChildren(outline); }
    visitLocalVariable(outline) { this.visitChildren(outline); }
    visitMethod(outline) { this.visitChildren(outline); }
    visitParameter(outline) { this.visitChildren(outline); }
    visitPrefix(outline) { this.visitChildren(outline); }
    visitSetter(outline) { this.visitChildren(outline); }
    visitTopLevelVariable(outline) { this.visitChildren(outline); }
    visitTypeParameter(outline) { this.visitChildren(outline); }
    visitUnitTestGroup(outline) { this.visitChildren(outline); }
    visitUnitTestTest(outline) { this.visitChildren(outline); }
    visitUnknown(outline) { this.visitChildren(outline); }
}
exports.OutlineVisitor = OutlineVisitor;
class TestOutlineVisitor extends OutlineVisitor {
    constructor() {
        super(...arguments);
        this.tests = [];
        this.names = [];
    }
    visitUnitTestTest(outline) {
        this.addTest(outline, super.visitUnitTestTest);
    }
    visitUnitTestGroup(outline) {
        this.addTest(outline, super.visitUnitTestGroup);
    }
    addTest(outline, base) {
        const name = this.extractTestName(outline.element.name);
        if (!name)
            return;
        this.names.push(name);
        const fullName = this.names.join(" ");
        const isGroup = outline.element.kind === "UNIT_TEST_GROUP";
        this.tests.push({
            file: outline.element.location.file,
            fullName,
            isGroup,
            length: outline.element.location.length,
            offset: outline.element.location.offset,
        });
        try {
            base.bind(this)(outline);
        }
        finally {
            this.names.pop();
        }
    }
    extractTestName(elementName) {
        if (!elementName)
            return;
        // Strip off the function name/parent like test( or testWidget(
        const openParen = elementName.indexOf("(");
        const closeParen = elementName.lastIndexOf(")");
        if (openParen === -1 || closeParen === -1 || openParen > closeParen)
            return;
        elementName = elementName.substring(openParen + 1, closeParen);
        // To avoid implemented Dart string parsing here (escaping, triple quotes, etc.)
        // we will just require that a string is quoted at each end with the same character
        // and contains zero of that character inside the string, and zero backslashes.
        const quoteCharacter = elementName.substr(0, 1);
        if (elementName.slice(-1) !== quoteCharacter)
            return;
        elementName = elementName.slice(1, -1);
        if (elementName.indexOf(quoteCharacter) !== -1 || elementName.indexOf("\\") !== -1)
            return;
        return elementName;
    }
}
exports.TestOutlineVisitor = TestOutlineVisitor;
//# sourceMappingURL=outline.js.map