"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PreviewOption;
(function (PreviewOption) {
    PreviewOption[PreviewOption["Full"] = 0] = "Full";
    PreviewOption[PreviewOption["Headers"] = 1] = "Headers";
    PreviewOption[PreviewOption["Body"] = 2] = "Body";
    PreviewOption[PreviewOption["Exchange"] = 3] = "Exchange";
})(PreviewOption = exports.PreviewOption || (exports.PreviewOption = {}));
function fromString(value) {
    value = value.toLowerCase();
    switch (value) {
        case 'headers':
            return PreviewOption.Headers;
        case 'body':
            return PreviewOption.Body;
        case 'exchange':
            return PreviewOption.Exchange;
        case 'full':
        default:
            return PreviewOption.Full;
    }
}
exports.fromString = fromString;
//# sourceMappingURL=previewOption.js.map