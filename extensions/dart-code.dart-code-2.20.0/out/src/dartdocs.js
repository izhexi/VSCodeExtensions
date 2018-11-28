"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const darkIconUrlFormat = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_$1_white_36px.svg";
const lightIconUrlFormat = "https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_$1_black_36px.svg";
const iconRegex = new RegExp(`(?:${_.escapeRegExp("<p>")})?`
    + _.escapeRegExp('<i class="material-icons md-36">')
    + "([\\w\\s_]+)"
    + _.escapeRegExp('</i> &#x2014; material icon named "')
    + "([\\w\\s_]+)"
    + _.escapeRegExp('".')
    + `(?:${_.escapeRegExp("</p>")})?`, "gi");
const dartDocDirectives = new RegExp(`(\\n\\s*{@.*?}$)|(^{@.*?}\\s*\\n)`, "gim");
const dartDocCodeBlockSections = new RegExp(`(\`\`\`\\w+) +\\w+`, "gi");
function cleanDartdoc(doc) {
    if (!doc)
        return "";
    // Clean up some dart.core dartdoc.
    const index = doc.indexOf("## Other resources");
    if (index !== -1)
        doc = doc.substring(0, index);
    // Remove colons from old-style references like [:foo:].
    doc = doc.replace(/\[:\S+:\]/g, (match) => `[${match.substring(2, match.length - 2)}]`);
    // Change any links without hyperlinks to just code syntax.
    // That is, anything in [squares] that isn't a [link](http://blah).
    // Note: To ensure we get things at the end, we need to match "not a paren or end of string"
    // and we need to put that character back in since the regex consumed it.
    doc = doc.replace(/\[(\S+)\]([^(]|$)/g, (match, one, two) => `\`${one}\`${two}`);
    // TODO: Use light/dark theme as appropriate.
    doc = doc.replace(iconRegex, `![$1](${darkIconUrlFormat}|width=100,height=100)`);
    // Remove any directives like {@template xxx}
    doc = doc.replace(dartDocDirectives, "");
    // Remove any code block section names like ```dart preamble
    doc = doc.replace(dartDocCodeBlockSections, "$1");
    return doc;
}
exports.cleanDartdoc = cleanDartdoc;
//# sourceMappingURL=dartdocs.js.map