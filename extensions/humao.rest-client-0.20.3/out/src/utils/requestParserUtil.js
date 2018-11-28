'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class RequestParserUtil {
    static parseRequestHeaders(headerLines) {
        // message-header = field-name ":" [ field-value ]
        let headers = {};
        let headerNames = {};
        headerLines.forEach(headerLine => {
            let fieldName;
            let fieldValue;
            let separatorIndex = headerLine.indexOf(':');
            if (separatorIndex === -1) {
                fieldName = headerLine.trim();
                fieldValue = '';
            }
            else {
                fieldName = headerLine.substring(0, separatorIndex).trim();
                fieldValue = headerLine.substring(separatorIndex + 1).trim();
            }
            let normalizedFieldName = fieldName.toLowerCase();
            if (!headerNames[normalizedFieldName]) {
                headerNames[normalizedFieldName] = fieldName;
                headers[fieldName] = fieldValue;
            }
            else {
                let splitter = normalizedFieldName === 'cookie' ? ';' : ',';
                headers[headerNames[normalizedFieldName]] += `${splitter}${fieldValue}`;
            }
        });
        return headers;
    }
}
exports.RequestParserUtil = RequestParserUtil;
//# sourceMappingURL=requestParserUtil.js.map