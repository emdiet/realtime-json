import { RealtimeJSONParser } from ".."

describe("pretext", () => {
    test("```[]```", async () => {
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

        realtimeParser.next("```");
        realtimeParser.next("[");
        realtimeParser.next("]");

        expect(values).toEqual([]);	
        expect(complete).toBe(true);
        expect(error).toBe(false);

        try {
            realtimeParser.next("```");
        } catch(e) {}

    });

    test("```JSON\n\n[{}]```", async () => {
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

        realtimeParser.next("```");
        realtimeParser.next("JSON");
        realtimeParser.next("\n\n");
        realtimeParser.next("[");
        realtimeParser.next("{}");
        realtimeParser.next("]");
        
        try {
            realtimeParser.next("```");
        } catch(e) {}

        expect(values).toEqual([{}]);	
        expect(complete).toBe(true);
        expect(error).toBe(false);
    });


})