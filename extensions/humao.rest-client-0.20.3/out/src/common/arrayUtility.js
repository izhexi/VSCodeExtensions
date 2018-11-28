'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class ArrayUtility {
    static skipWhile(items, callbackfn) {
        let index = 0;
        for (; index < items.length; index++) {
            if (!callbackfn(items[index], index, items)) {
                break;
            }
        }
        return items.slice(index);
    }
    static firstIndexOf(items, callbackfn, start) {
        if (!start) {
            start = 0;
        }
        let index = start;
        for (; index < items.length; index++) {
            if (callbackfn(items[index], index, items)) {
                break;
            }
        }
        return index >= items.length ? -1 : index;
    }
}
exports.ArrayUtility = ArrayUtility;
//# sourceMappingURL=arrayUtility.js.map