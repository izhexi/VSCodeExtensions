'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var FormParamEncodingStrategy;
(function (FormParamEncodingStrategy) {
    FormParamEncodingStrategy[FormParamEncodingStrategy["Automatic"] = 0] = "Automatic";
    FormParamEncodingStrategy[FormParamEncodingStrategy["Never"] = 1] = "Never";
    FormParamEncodingStrategy[FormParamEncodingStrategy["Always"] = 2] = "Always";
})(FormParamEncodingStrategy = exports.FormParamEncodingStrategy || (exports.FormParamEncodingStrategy = {}));
function fromString(value) {
    value = value.toLowerCase();
    switch (value) {
        case 'never':
            return FormParamEncodingStrategy.Never;
        case 'always':
            return FormParamEncodingStrategy.Always;
        case 'automatic':
        default:
            return FormParamEncodingStrategy.Automatic;
    }
}
exports.fromString = fromString;
//# sourceMappingURL=formParamEncodingStrategy.js.map