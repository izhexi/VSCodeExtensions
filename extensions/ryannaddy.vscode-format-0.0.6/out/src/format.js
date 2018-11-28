"use strict";
var vscode_1 = require('vscode');
var Format = (function () {
    function Format() {
    }
    Format.document = function (source, formattingOptions, languageId) {
        var config = vscode_1.workspace.getConfiguration('format');
        this.options = formattingOptions;
        this.source = source;
        this.langId = languageId;
        // Config base
        var space = config.get('space');
        var newLine = config.get('newLine');
        this.space = space;
        this.newLine = newLine;
        var spaceOther = space.language[languageId];
        var braceSpaceOpenBefore = space.brace.open.before;
        var braceNewLine = newLine.brace;
        var parenSpaceOpenBefore = space.parenthesis.open.before;
        var parenSpaceOpenAfter = space.parenthesis.open.after;
        var parenSpaceCloseBefore = space.parenthesis.close.before;
        var s = '';
        var ignoreSpace = false;
        var lastKeyword = '';
        var inString = false;
        var inComment = false;
        var commentType = null;
        var stringChar = null;
        for (var i = 0; i < source.length; i++) {
            this.offset = i;
            this.char = source[i];
            this.next = source[i + 1];
            this.prev = source[i - 1];
            this.words = this.cleanArray(s.split(/[\s\(\)\[\];|'"\{\}]/));
            this.last = this.words[this.words.length - 1];
            var spaces = this.getSpaces(this.char);
            switch (this.char) {
                case '/':
                    // If we are not in a comment
                    if (!inComment && this.next == '/' || this.prev == '/') {
                        inComment = true;
                        commentType = CommentType.SingleLine;
                    }
                    else if (!inComment && this.next == '*') {
                        inComment = true;
                        commentType = CommentType.MultiLine;
                    }
                    else if (inComment && commentType == CommentType.MultiLine) {
                        inComment = false;
                        commentType = null;
                    }
                    s += this.char;
                    break;
                case '\n':
                    if (inComment && commentType == CommentType.SingleLine) {
                        inComment = false;
                        commentType = null;
                    }
                    s += this.char;
                    break;
                case '"':
                case '\'':
                    if (stringChar == this.char && inString) {
                        inString = false;
                        stringChar = null;
                    }
                    else if (stringChar === null && !inString) {
                        inString = true;
                        stringChar = this.char;
                    }
                    s += this.char;
                    break;
                case '{':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    this.depth++;
                    ignoreSpace = true;
                    if (!braceNewLine) {
                        var c = 0;
                        for (var j in braceSpaceOpenBefore) {
                            if (lastKeyword == j) {
                                s = s.trim();
                                s += this.spacePlaceholder(braceSpaceOpenBefore[j]);
                                s = s.trim();
                                c++;
                                break;
                            }
                        }
                        if (c == 0) {
                            s = s.trim();
                            s += this.spacePlaceholder(braceSpaceOpenBefore.other);
                            s = s.trim();
                        }
                    }
                    else {
                        var lineStr = this.lineAtIndex(s, s.length).trim();
                        if (lineStr != '') {
                            s += '\n' + this.indent(this.depth - 1);
                        }
                    }
                    s += this.char;
                    break;
                case '}':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    this.depth--;
                    s += this.char;
                    break;
                case '(':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    for (var j in parenSpaceOpenBefore) {
                        if (this.last == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceOpenBefore[j]);
                            s = s.trim();
                            lastKeyword = this.last;
                            break;
                        }
                    }
                    s += this.char;
                    for (var j in parenSpaceOpenAfter) {
                        if (this.last == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceOpenAfter[j]);
                            s = s.trim();
                            break;
                        }
                    }
                    break;
                case ')':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    for (var j in parenSpaceCloseBefore) {
                        if (lastKeyword == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceCloseBefore[j]);
                            s = s.trim();
                            break;
                        }
                    }
                    s += this.char;
                    break;
                case ',':
                case ':':
                case ';':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatItem(this.char, s, spaces);
                    break;
                case '?':
                case '>':
                case '<':
                case '=':
                case '!':
                case '&':
                case '|':
                case '+':
                case '-':
                case '*':
                case '/':
                case '%':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(this.char, s, spaces);
                    break;
                default:
                    if (spaceOther && this.char in spaceOther) {
                        if (inString || inComment) {
                            s += this.char;
                            break;
                        }
                        ignoreSpace = true;
                        s = this.formatItem(this.char, s, new Spaces((spaceOther[this.char].before || 0), (spaceOther[this.char].after || 0)));
                    }
                    else {
                        if (inString || inComment) {
                            s += this.char;
                            break;
                        }
                        if (ignoreSpace && this.char == ' ') {
                        }
                        else {
                            s += this.char;
                            ignoreSpace = false;
                        }
                    }
                    break;
            }
        }
        s = s.replace(new RegExp(Format.spacePlaceholderStr, 'g'), ' ');
        return s;
    };
    Format.languageOverride = function (char) {
        if (this.space.language[this.langId] && this.space.language[this.langId][char]) {
            return this.space.language[this.langId][char];
        }
        return null;
    };
    Format.getSpaces = function (char) {
        var spaces = new Spaces();
        var config = vscode_1.workspace.getConfiguration('format');
        switch (char) {
            case '&':
                spaces.before = config.get('space.and.before', 1);
                spaces.after = config.get('space.and.after', 1);
                break;
            case '|':
                spaces.before = config.get('space.or.before', 1);
                spaces.after = config.get('space.or.after', 1);
                break;
            case ',':
                spaces.before = config.get('space.comma.before', 1);
                spaces.after = config.get('space.comma.after', 1);
                break;
            case '>':
                spaces.before = config.get('space.greaterThan.before', 1);
                spaces.after = config.get('space.greaterThan.after', 1);
                break;
            case '<':
                spaces.before = config.get('space.lessThan.before', 1);
                spaces.after = config.get('space.lessThan.after', 1);
                break;
            case '=':
                spaces.before = config.get('space.equal.before', 1);
                spaces.after = config.get('space.equal.after', 1);
                break;
            case '!':
                spaces.before = config.get('space.not.before', 1);
                spaces.after = config.get('space.not.after', 1);
                break;
            case '=':
                spaces.before = config.get('space.question.before', 1);
                spaces.after = config.get('space.question.after', 1);
                break;
            case '=':
                spaces.before = config.get('space.colon.before', 1);
                spaces.after = config.get('space.colon.after', 1);
                break;
            case '-':
                if (this.next == '-' || this.prev == '-' || this.next.match(/\d/)) {
                    spaces.before = config.get('space.increment.before', 0);
                    spaces.after = config.get('space.increment.after', 0);
                }
                else {
                    spaces.before = config.get('space.subtract.before', 1);
                    spaces.after = config.get('space.subtract.after', 1);
                }
                break;
            case '+':
                if (this.next == '+' || this.prev == '+') {
                    spaces.before = config.get('space.decrement.before', 0);
                    spaces.after = config.get('space.decrement.after', 0);
                }
                else {
                    spaces.before = config.get('space.add.before', 1);
                    spaces.after = config.get('space.add.after', 1);
                }
                break;
            case ';':
                spaces.before = config.get('space.semicolon.before', 1);
                spaces.after = config.get('space.semicolon.after', 1);
                break;
            case '*':
                spaces.before = config.get('space.multiply.before', 1);
                spaces.after = config.get('space.multiply.after', 1);
                break;
            case '/':
                spaces.before = config.get('space.divide.before', 1);
                spaces.after = config.get('space.divide.after', 1);
                break;
            case '%':
                spaces.before = config.get('space.modulo.before', 1);
                spaces.after = config.get('space.modulo.after', 1);
                break;
        }
        return spaces;
    };
    Format.formatItem = function (char, s, spaces) {
        var override = this.languageOverride(char);
        if (override) {
            spaces = override;
        }
        s = s.trim();
        s += Format.spacePlaceholderStr.repeat(spaces.before);
        s += char;
        s += Format.spacePlaceholderStr.repeat(spaces.after);
        return s.trim();
    };
    Format.formatOperator = function (char, s, spaces) {
        var override = this.languageOverride(char);
        if (override) {
            spaces = override;
        }
        s = s.trim();
        if (this.prev && this.notBefore(this.prev, '=', '!', '>', '<', '?', '%', '&', '|', '/')) {
            s += Format.spacePlaceholderStr.repeat(spaces.before);
        }
        s = s.trim();
        s += char;
        s = s.trim();
        if (this.next && this.notAfter(this.next, '=', '>', '<', '?', '%', '&', '|', '/')) {
            if (char != '?' || this.source.substr(this.offset, 4) != '?php') {
                s += Format.spacePlaceholderStr.repeat(spaces.after);
            }
        }
        return s.trim();
    };
    Format.notBefore = function (prev) {
        var char = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            char[_i - 1] = arguments[_i];
        }
        for (var c in char) {
            if (char[c] == prev) {
                return false;
            }
        }
        return true;
    };
    Format.notAfter = function (next) {
        var char = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            char[_i - 1] = arguments[_i];
        }
        for (var c in char) {
            if (char[c] == next) {
                return false;
            }
        }
        return true;
    };
    Format.cleanArray = function (arr) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == '') {
                arr.splice(i, 1);
                i--;
            }
        }
        return arr;
    };
    Format.spacePlaceholder = function (length) {
        return Format.spacePlaceholderStr.repeat(length);
    };
    Format.lineAtIndex = function (str, idx) {
        var first = str.substring(0, idx);
        var last = str.substring(idx);
        var firstNewLine = first.lastIndexOf("\n");
        var secondNewLine = last.indexOf("\n");
        if (secondNewLine == -1) {
            secondNewLine = last.length;
        }
        return str.substring(firstNewLine + 1, idx + secondNewLine);
    };
    Format.indent = function (amount) {
        amount = amount < 0 ? 0 : amount;
        return Format.spacePlaceholderStr.repeat(amount * 4);
    };
    Format.spacePlaceholderStr = '__VSCODE__SPACE__PLACEHOLDER__';
    Format.depth = 0;
    Format.offset = 0;
    Format.prev = '';
    Format.next = '';
    return Format;
}());
exports.Format = Format;
(function (CommentType) {
    CommentType[CommentType["SingleLine"] = 0] = "SingleLine";
    CommentType[CommentType["MultiLine"] = 1] = "MultiLine";
})(exports.CommentType || (exports.CommentType = {}));
var CommentType = exports.CommentType;
var Spaces = (function () {
    function Spaces(before, after) {
        if (before === void 0) { before = 0; }
        if (after === void 0) { after = 0; }
        this.before = 0;
        this.after = 0;
        this.before = before;
        this.after = after;
    }
    return Spaces;
}());
exports.Spaces = Spaces;
//# sourceMappingURL=format.js.map