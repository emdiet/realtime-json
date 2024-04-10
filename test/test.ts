import { Observable, Observer, Subscription } from "../types/observable"

const testArticle1 = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
const testArticle2 = `
{
    "name": "John",
    "age": 30,
    "city": "New York"
}
`;
const testArticle2query1 = ["name"];
const testArticle2query2 = ["age"];
const testArticle2query3 = ["city"];
const testArticle2query4 = ["*"];
// alt syntax options
// stream.filter("name") -> this would yield a stream<string>, streaming the name
// stream.filter("name").object() -> this would yield a string promise, resolving to the name "John"
// stream.filter("name").objects() -> this wouldn't make any sense as root is an object, not an array

const testArticle3 = `
[
    {
        "name": "John",
        "age": 30,
        "city": "New York"
    },
    {
        "name": "Jane",
        "age": 25,
        "city": "Chicago"
    }
]
`;
const testArticle3query1 = ["*", "name"];
const testArticle3query2 = [0, "age"];
const testArticle3query3 = [[0,1], "city"];
// alt syntax options
// stream.split() -> this would yield a stream of streams.
// stream.split().objects() -> this would yield a stream<{name: string, age: number, city: string}>
// stream.split().object() -> this wouldn't make any sense as root is an array, not an object
// stream.filter(0) -> this would yield a stream<{name: string, age: number, city: string}> 
// stream.filter(0).object() -> this would yield a {name: string, age: number, city: string} promise

// alt 2
// stream.each()
// stream.each().objects()



const testArticle4 = `
{
    "name": "John",
    "age": 30,
    "city": "New York",
    "children": [
        {
            "name": "Jane",
            "age": 5
        },
        {
            "name": "Tom",
            "age": 3
        }
    ]
}
`;
// alt syntax options
// stream.filter("children") -> this wouldn't really mean anything on its own
// stream.filter("children").split() -> this would yield a stream of streams
// stream.filter("children").split().objects() -> this would yield a stream<{name: string, age: number}>
// stream.filter("children").split().object() -> this wouldn't make any sense as root is an array, not an object
// stream.filter("children").filter(0) -> this would yield a stream<string> // unparsed json
// stream.filter("children").filter(0).object() -> this would yield a {name: string, age: number} promise

// alt 2
// stream.select("children").each()
// stream.select("children").each().objects()
// stream.each().kvObjects() ->  {"name": "John"}, {"age": 30}, {"city": "New York"}, {"children": [{"name": "Jane", "age": 5}, {"name": "Tom", "age": 3}]}



const testArticle5 = `  
[
    {
        "name": "John",
        "age": 30,
        "city": "New York",
        "children": [
            {
                "name": "Jane",
                "age": 5
            },
            {
                "name": "Tom",
                "age": 3
            }
        ]
    },
    {
        "name": "Jane",
        "age": 25,
        "city": "Chicago",
        "children": [
            {
                "name": "Alice",
                "age": 3
            }
        ]
    }
]
`;


/**
 * generates an observable that emits a chunk of the input every time poke is called
 * @param input text to be emitted
 * @param chaos array of random numbers to be used to determine the length of the next chunk
 * @param seed seed for the random number generator
 */
export function generator (input : string, chaos = [1,2,5, 7, 10, 11, 20], seed = 123) : {
    output: Observable<string>,
    poke: () => void,
    isDone: () => boolean;
    _getProgress: () => number;
} {
    let progress = 0;
    // get a random number generator with provided seed
    const random = () => chaos[((1103515245 * seed++ + progress) % 39916801) % chaos.length]

    let closed = false;
    const output = new BehaviorSubject<string>("");
    //const output = {
    //    subscribe: (observer : Observer<string>) => {
    //        if(subscriber) throw new Error("Only one subscriber allowed")
    //        subscriber = observer;
    //        return {
    //            unsubscribe: () => closed = true
    //        }
    //    },
    //    isClosed: () => closed
    //}

    const poke = () => {
        if(closed)  
            throw new Error("Observable is closed")
        if(progress >= input.length) {
            output.complete();
            closed = true;
            return;
        }
        const oldProgress = progress;
        progress = progress + random();
        output.next(input.slice(oldProgress, progress));

        if(progress >= input.length) {
            output.complete();
            closed = true;
        }
    }

    return {
        output,
        poke,
        isDone: () => progress >= input.length,
        _getProgress: () => progress
    }
}


class BehaviorSubject<T> implements Observable<T> {
    private observers: Observer<T>[] = [];
    private value: T;
    private _closed = false;

    constructor(value: T) {
        this.value = value;
    }

    subscribe(observer: Observer<T>): Subscription {
        this.observers.push(observer);
        observer.next(this.value);
        return {
            unsubscribe: () => {
                this.observers = this.observers.filter(o => o !== observer);
            }
        }
    }

    next(value: T) {
        this.value = value;
        this.observers.forEach(o => o.next(value));
    }

    complete() {
        this.observers.forEach(o => o.complete());
        this._closed = true;
    }

    get closed(): boolean{
        return this._closed;
    }
}