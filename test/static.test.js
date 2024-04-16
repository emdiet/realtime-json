"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
describe("arrays", () => {
    test("[{}]", () => __awaiter(void 0, void 0, void 0, function* () {
        const realtimeParser = new __1.RealtimeJSONParser();
        const values = [];
        let complete = false;
        let error = false;
        realtimeParser.observeObjects("").subscribe({
            next: (v) => values.push(v),
            error: () => {
                error = true;
            },
            complete: () => {
                complete = true;
            }
        });
        realtimeParser.next("[");
        realtimeParser.next("{");
        realtimeParser.next("}");
        realtimeParser.next("]");
        expect(values).toEqual([{}]);
        expect(complete).toBe(true);
        expect(error).toBe(false);
    }));
    test("[{},{}]", () => __awaiter(void 0, void 0, void 0, function* () {
        const realtimeParser = new __1.RealtimeJSONParser();
        const values = [];
        let complete = false;
        let error = false;
        realtimeParser.observeObjects("").subscribe({
            next: (v) => values.push(v),
            error: () => {
                error = true;
            },
            complete: () => {
                complete = true;
            }
        });
        realtimeParser.next("[");
        realtimeParser.next("{");
        realtimeParser.next("}");
        realtimeParser.next(",");
        realtimeParser.next("{");
        realtimeParser.next("}");
        realtimeParser.next("]");
        expect(values).toEqual([{}, {}]);
        expect(complete).toBe(true);
        expect(error).toBe(false);
    }));
    test("[{\"a\":1}]", () => __awaiter(void 0, void 0, void 0, function* () {
        const realtimeParser = new __1.RealtimeJSONParser();
        const values = [];
        let complete = false;
        let error = false;
        realtimeParser.observeObjects("").subscribe({
            next: (v) => values.push(v),
            error: () => {
                error = true;
            },
            complete: () => {
                complete = true;
            }
        });
        realtimeParser.next("[");
        realtimeParser.next("{\"a\":1}");
        realtimeParser.next("]");
        // expect(values).toEqual([{a: 1}]);	
        expect(values).toEqual([{ a: "1" }]);
        expect(complete).toBe(true);
        expect(error).toBe(false);
    }));
    test("[{\"a\":true},{\"b\":False}]", () => __awaiter(void 0, void 0, void 0, function* () {
        const realtimeParser = new __1.RealtimeJSONParser();
        const values = [];
        let complete = false;
        let error = false;
        realtimeParser.observeObjects("").subscribe({
            next: (v) => values.push(v),
            error: () => {
                error = true;
            },
            complete: () => {
                complete = true;
            }
        });
        realtimeParser.next("[");
        realtimeParser.next("{\"a\":true}");
        realtimeParser.next(",");
        realtimeParser.next("{\"b\":False}");
        realtimeParser.next("]");
        // expect(values).toEqual([{a: true}, {b: false}]);	
        expect(values).toEqual([{ a: "true" }, { b: "False" }]);
        expect(complete).toBe(true);
        expect(error).toBe(false);
    }));
});
//# sourceMappingURL=static.test.js.map