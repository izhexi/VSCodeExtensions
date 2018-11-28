"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
function waitFor(action, checkEveryMilliseconds = 20, tryForMilliseconds = 2000) {
    return __awaiter(this, void 0, void 0, function* () {
        let timeRemaining = tryForMilliseconds;
        while (timeRemaining > 0) {
            const res = action();
            if (res)
                return res;
            yield new Promise((resolve) => setTimeout(resolve, checkEveryMilliseconds));
            timeRemaining -= 20;
        }
    });
}
exports.waitFor = waitFor;
//# sourceMappingURL=promises.js.map