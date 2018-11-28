"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class default_1 {
    /**
     * isValid
     * @param text
     */
    isValid(text) {
        try {
            return typeof JSON.parse(text) === "object";
        }
        catch (err) {
            return false;
        }
    }
    /**
     * escape
     * @param text
     */
    escape(text) {
        return this.isValid(text)
            ? JSON.stringify(text)
                .replace(/^"/g, "")
                .replace(/"$/g, "")
            : text;
    }
    /**
     * unescape
     * @param text
     */
    unescape(text) {
        let formattedText = text;
        try {
            if (!text.startsWith('"')) {
                formattedText = '"'.concat(formattedText);
            }
            if (!text.endsWith('"')) {
                formattedText = formattedText.concat('"');
            }
            return JSON.parse(formattedText);
        }
        catch (err) {
            return text;
        }
    }
    /**
     * beautify
     * @param text
     * @param tabSize
     */
    beautify(text, tabSize) {
        return this.isValid(text)
            ? JSON.stringify(JSON.parse(text), null, tabSize)
            : text;
    }
    /**
     * uglify
     * @param text
     */
    uglify(text) {
        return this.isValid(text)
            ? JSON.stringify(JSON.parse(text), null, 0)
            : text;
    }
    /**
     * dispose
     */
    dispose() { }
}
exports.default = default_1;
//# sourceMappingURL=json-helper.js.map