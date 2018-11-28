"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configurationSettings_1 = require("../models/configurationSettings");
const mime_1 = require("../models/mime");
const mime = require('mime-types');
class MimeUtility {
    static parse(contentTypeString) {
        // application/json; charset=utf-8
        // application/vnd.github.chitauri-preview+sha
        let params = contentTypeString.split(';');
        let types = params[0].trim().split('+');
        let charset = null;
        if (params.length > 1) {
            for (let i = 1; i < params.length; i++) {
                let attributes = params[i].trim().split('=', 2);
                if (attributes.length === 2 && attributes[0].toLowerCase() === 'charset') {
                    charset = attributes[1].trim();
                }
            }
        }
        return new mime_1.MIME(types[0].toLowerCase(), types[1] ? `+${types[1]}`.toLowerCase() : '', contentTypeString, charset);
    }
    static getExtension(contentTypeString, defaultExtension = 'http') {
        const mimeType = MimeUtility.parse(contentTypeString);
        const contentTypeWithoutCharsets = `${mimeType.type}${mimeType.suffix}`;
        const restClientSettings = configurationSettings_1.RestClientSettings.Instance;
        // Check if user has custom mapping for this content type first
        if (contentTypeWithoutCharsets in restClientSettings.mimeAndFileExtensionMapping) {
            let ext = restClientSettings.mimeAndFileExtensionMapping[contentTypeWithoutCharsets];
            ext = ext.replace(/^(\.)+/, "");
            if (ext) {
                return ext;
            }
        }
        return mime.extension(contentTypeString) || defaultExtension;
    }
    static isBrowserSupportedImageFormat(contentTypeString) {
        // https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
        // For chrome supports JPEG, GIF, WebP, PNG and BMP
        if (!contentTypeString) {
            return false;
        }
        let type = MimeUtility.parse(contentTypeString).type;
        return MimeUtility.supportedImagesFormats.includes(type);
    }
    static isJSON(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        const { type, suffix } = MimeUtility.parse(contentTypeString);
        return type === 'application/json' || suffix === '+json';
    }
    static isXml(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        let { type, suffix } = MimeUtility.parse(contentTypeString);
        return type === 'application/xml' || type === 'text/xml' || suffix === '+xml';
    }
    static isHtml(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        return MimeUtility.parse(contentTypeString).type === 'text/html';
    }
    static isJavaScript(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        return MimeUtility.parse(contentTypeString).type === 'application/javascript';
    }
    static isCSS(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        return MimeUtility.parse(contentTypeString).type === 'text/css';
    }
    static isMultiPartFormData(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        return MimeUtility.parse(contentTypeString).type === 'multipart/form-data';
    }
    static isFormUrlEncoded(contentTypeString) {
        if (!contentTypeString) {
            return false;
        }
        return MimeUtility.parse(contentTypeString).type === 'application/x-www-form-urlencoded';
    }
}
MimeUtility.supportedImagesFormats = [
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/png',
    'image/bmp'
];
exports.MimeUtility = MimeUtility;
//# sourceMappingURL=mimeUtility.js.map