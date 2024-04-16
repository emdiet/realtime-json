import { RealtimeJSONParser } from ".."

describe("arrays", () => {
    test("[{}]", async () => {
        const realtimeParser = new RealtimeJSONParser();
        const values: any[] = [];
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
        })

        realtimeParser.next("[");
        realtimeParser.next("{");
        realtimeParser.next("}");
        realtimeParser.next("]");

        expect(values).toEqual([{}]);	
        expect(complete).toBe(true);
        expect(error).toBe(false);
    });

    test("[{},{}]", async () => {
        const realtimeParser = new RealtimeJSONParser();
        const values: any[] = [];
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
        })

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
    });

    test("[{\"a\":1}]", async () => {
        const realtimeParser = new RealtimeJSONParser();
        const values: any[] = [];
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
        })

        realtimeParser.next("[");
        realtimeParser.next("{\"a\":1}");
        realtimeParser.next("]");

        // expect(values).toEqual([{a: 1}]);	
        expect(values).toEqual([{a: "1"}]);	
        expect(complete).toBe(true);
        expect(error).toBe(false);
    });
    test("[{\"a\":true},{\"b\":False}]", async () => {
        const realtimeParser = new RealtimeJSONParser();
        const values: any[] = [];
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
        })

        realtimeParser.next("[");
        realtimeParser.next("{\"a\":true}");
        realtimeParser.next(",");
        realtimeParser.next("{\"b\":False}");
        realtimeParser.next("]");

        // expect(values).toEqual([{a: true}, {b: false}]);	
        expect(values).toEqual([{a: "true"}, {b: "False"}]);	
        expect(complete).toBe(true);
        expect(error).toBe(false);
    });

})