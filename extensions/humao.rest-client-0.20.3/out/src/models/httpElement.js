"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpElement {
    constructor(name, type, prefix = null, description = null, text = null) {
        this.name = name;
        this.type = type;
        this.prefix = prefix;
        this.description = description;
        this.text = text;
        if (!this.text) {
            this.text = name;
        }
        if (typeof this.text === 'string') {
            if (type === ElementType.Header) {
                this.text = `${this.text}: `;
            }
            else if (type === ElementType.Method) {
                this.text = `${this.text} `;
            }
            this.text = this.text.replace(/[\{\}]/g, "\\$&");
        }
        if (type === ElementType.SystemVariable) {
            this.name = name.substr(1);
        }
    }
}
exports.HttpElement = HttpElement;
var ElementType;
(function (ElementType) {
    ElementType[ElementType["Method"] = 0] = "Method";
    ElementType[ElementType["URL"] = 1] = "URL";
    ElementType[ElementType["Header"] = 2] = "Header";
    ElementType[ElementType["MIME"] = 3] = "MIME";
    ElementType[ElementType["Authentication"] = 4] = "Authentication";
    ElementType[ElementType["SystemVariable"] = 5] = "SystemVariable";
    ElementType[ElementType["EnvironmentCustomVariable"] = 6] = "EnvironmentCustomVariable";
    ElementType[ElementType["FileCustomVariable"] = 7] = "FileCustomVariable";
    ElementType[ElementType["RequestCustomVariable"] = 8] = "RequestCustomVariable";
})(ElementType = exports.ElementType || (exports.ElementType = {}));
//# sourceMappingURL=httpElement.js.map