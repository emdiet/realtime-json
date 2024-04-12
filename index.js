"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subject = exports.RealtimeJSONParser = void 0;
const trailingCommasAllowed = true;
const objectCommaSeparatorRequired = false;
const outOfScopeWarnings = true;
const ignoreWhiteSpacesAndApostrophes = true; // for gpt-4-turbo hallucinations
// modes
const START = Symbol("START"); // [ or { or " or number
const BEFORE_KEY = Symbol("BEFORE_KEY"); // white space before key
const BEGIN_KEY = Symbol("BEGIN_KEY"); // "
const KEY = Symbol("KEY"); // key
const END_KEY = Symbol("END_KEY"); // terminating "
const BEFORE_COLON = Symbol("BEFORE_COLON"); // white space until :
const COLON = Symbol("COLON");
const BEFORE_VALUE = Symbol("BEFORE_VALUE"); // white space until " or { or [ or number
const BEGIN_VALUE = Symbol("BEGIN_VALUE"); // " or { or [ or number
const OBJECT = Symbol("OBJECT"); // currently handed over to a subparser
const ARRAY = Symbol("ARRAY"); // currently handed over to a subparser
const STRING = Symbol("STRING");
const NUMBER = Symbol("NUMBER");
const AFTER_VALUE = Symbol("AFTER_VALUE"); // white space until , or ] or }
const END = Symbol("END");
class RealtimeJSONParser {
    constructor(input) {
        this.input = input;
        this.__activeSubParser = this;
        this.closed = false;
        this.rootMode = START;
        this.stringListeners = [];
        this.objectListeners = [];
        if (!input) {
            return;
        }
        input.subscribe({
            next: (value) => {
                if (value === "")
                    return;
                try {
                    this.__activeSubParser = this.__activeSubParser.__push(value);
                }
                catch (e) {
                    this.stringListeners.forEach(listener => {
                        listener.observer.error(e);
                    });
                    this.objectListeners.forEach(listener => {
                        listener.observer.error(e);
                    });
                    throw e;
                }
            },
            error: (error) => {
                this.stringListeners.forEach(listener => {
                    listener.observer.error(error);
                });
                this.objectListeners.forEach(listener => {
                    listener.observer.error(error);
                });
            },
            complete: () => {
                this.stringListeners.forEach(listener => {
                    listener.observer.complete();
                });
                this.objectListeners.forEach(listener => {
                    listener.observer.complete();
                });
            }
        });
    }
    next(value) {
        if (this.input) {
            throw new Error("input already provided: use input stream instead");
        }
        if (this.closed) {
            throw new Error("unexpected character(s) after closing");
        }
        if (value === "")
            return;
        this.__activeSubParser = this.__activeSubParser.__push(value);
    }
    // receive a value from below
    __push(chunk) {
        if (this.closed) {
            throw new Error("unexpected character after closing");
        }
        // expect chunk[0] to be "{" or "["
        switch (chunk[0]) {
            case "{": {
                const parser = new SubObjectParser(this.__activeSubParser, this.stringListeners, this.objectListeners);
                return parser.__push(chunk);
            }
            case "[": {
                const parser = new SubArrayParser(this.__activeSubParser, this.stringListeners, this.objectListeners);
                return parser.__push(chunk);
            }
            case '"': {
                const parser = new SubStringParser(this.__activeSubParser, this.stringListeners, this.objectListeners);
                return parser.__push(chunk);
            }
            case " ":
            case "\t":
            case "\n":
            case "\r":
            case "`": {
                if (ignoreWhiteSpacesAndApostrophes) {
                    // trim all instances of these characters from the front
                    const trimmed = chunk.replace(/^[\s\t\n\r`]+/, "");
                    // if empty, return this
                    if (!trimmed)
                        return this;
                    // otherwise, continue with trimmed
                    return this.__push(trimmed);
                }
                else {
                    throw new Error("unexpected whitespace");
                }
            }
            default: {
                const parser = new SubNumberParser(this.__activeSubParser, this.stringListeners, this.objectListeners);
                return parser.__push(chunk);
            }
        }
    }
    // receive a value from above
    // if this is called from a subparser here, we're done.
    __pass(chunk, result) {
        this.__emitDelta(result);
        this.__close();
        // close all listeners that aren't closed yet
        this.stringListeners.forEach(listener => { listener.observer.complete(); });
        this.objectListeners.forEach(listener => { listener.observer.complete(); });
        return this;
    }
    __emitDelta(delta) {
        console.warn("not implemented!");
        console.log("emission:", delta);
    }
    __close() {
        this.closed = true;
        console.warn("not implemented!");
        console.log("closing");
    }
    /**
     * Observe the JSON stream
     * example query: "foo.bar" or ["foo", "bar"] queries the value at foo.bar
     * example query: "" or [] queries the root object
     * @param query
     */
    observeStream(query) {
        const path = this.__toQueryPath(query);
        const subject = new Subject();
        this.stringListeners.push({ path: path, depth: 0, arrayDepth: 0, observer: subject });
        return subject;
    }
    observeObjects(query) {
        const path = this.__toQueryPath(query);
        const subject = new Subject();
        this.objectListeners.push({ path: path, arrayDepth: 0, observer: subject });
        return subject;
    }
    __toQueryPath(query) {
        // if string is empty, query is [].
        // if string is not empty, query is split by ".".
        // if query is array, leave as is
        if (typeof query === "string") {
            if (query === "") {
                return [];
            }
            else {
                return query.split(".");
            }
        }
        else {
            return query;
        }
    }
}
exports.RealtimeJSONParser = RealtimeJSONParser;
class SubArrayParser {
    /** Transitions
    *
    * START -> BEFOREVALUE // eg.: [ followed by whitespace until value
    * BEFOREVALUE -> BEGINVALUE
    * BEGINVALUE -> OBJECT // {
    * BEGINVALUE -> ARRAY // [
    * BEGINVALUE -> STRING // "
    * BEGINVALUE -> NUMBER // 1
    *
    */
    constructor(parent, stringListeners, objectListeners) {
        this.parent = parent;
        this.stringListeners = stringListeners;
        this.objectListeners = objectListeners;
        this.mode = START;
        this.arraySoFar = [];
        // because we're in an array, trade listener depth for array depth
        stringListeners.forEach(listener => { listener.arrayDepth++; listener.depth--; });
        // objectListeners have no depth
        objectListeners.forEach(listener => { listener.arrayDepth++; });
    }
    // receive a value from below
    __push(chunk) {
        chunkDigest: while (chunk) {
            switch (this.mode) {
                case START:
                    {
                        // expect [
                        if (chunk[0] !== "[") {
                            throw new Error("unexpected character");
                        }
                        this.mode = BEFORE_VALUE;
                        // for string listeners meeting or exceeding max depth, emit "["
                        // this.stringListeners.filter(listener => listener.depth >= listener.path.length-1).forEach(listener => {
                        //     listener.observer.next("[");
                        // });
                        // always emit
                        this.stringListeners.forEach(listener => {
                            listener.observer.next("[");
                        });
                        chunk = chunk.slice(1);
                        continue chunkDigest;
                    }
                    ;
                case BEFORE_VALUE:
                    {
                        // trim all beginning whitespace
                        chunk = trimStart(chunk);
                        if (!chunk)
                            return this;
                        // determine listeners
                        const stringListeners = this.stringListeners;
                        stringListeners.forEach(listener => { listener.depth++; });
                        const objectListeners = this.objectListeners;
                        // expect { or [ or " or number
                        switch (chunk[0]) {
                            case "{": {
                                this.mode = OBJECT;
                                const parser = new SubObjectParser(this, stringListeners, objectListeners);
                                return parser.__push(chunk);
                            }
                            case "[": {
                                this.mode = ARRAY;
                                const parser = new SubArrayParser(this, stringListeners, objectListeners);
                                return parser.__push(chunk);
                            }
                            case '"': {
                                this.mode = STRING;
                                const parser = new SubStringParser(this, stringListeners, objectListeners);
                                return parser.__push(chunk);
                            }
                            case "]": {
                                if (trailingCommasAllowed) {
                                    // reduce listener depth again, like at the end of an object
                                    stringListeners.forEach(listener => { listener.depth--; });
                                    this.__close();
                                    return this.parent.__pass(chunk.slice(1), this.arraySoFar);
                                }
                                else {
                                    throw new Error("unexpected closing bracket in array");
                                }
                            }
                            default: {
                                this.mode = NUMBER;
                                const parser = new SubNumberParser(this, stringListeners, objectListeners);
                                return parser.__push(chunk);
                            }
                        }
                    }
                    ;
                case AFTER_VALUE: {
                    // we're done with the last object, so we expect a comma or a closing bracket, or whitespace
                    chunk = trimStart(chunk);
                    if (!chunk)
                        return this;
                    if (chunk[0] === ",") {
                        this.mode = BEFORE_VALUE;
                        // for string listeners meeting or exceeding max depth, emit ","
                        //this.stringListeners.filter(listener => listener.depth >= listener.path.length-1).forEach(listener => {
                        //    listener.observer.next(",");
                        //});
                        // always emit
                        this.stringListeners.forEach(listener => {
                            listener.observer.next(",");
                        });
                        chunk = chunk.slice(1);
                        continue chunkDigest;
                    }
                    else if (chunk[0] === "]") {
                        this.__close();
                        return this.parent.__pass(chunk.slice(1), this.arraySoFar);
                    }
                    else {
                        throw new Error("unexpected character after value in array : " + chunk[0]);
                    }
                }
            }
        }
        return this; // empty chunk, waiting for more
    }
    // receive a value from above
    __pass(chunk, result) {
        this.mode = AFTER_VALUE;
        this.arraySoFar.push(result);
        this.__emitDelta(result);
        const target = this.__push(chunk);
        return target;
    }
    __emitDelta(delta) {
        console.warn("not implemented!");
        console.log("emission:", delta);
    }
    __close() {
        console.warn("not implemented!");
        console.log("closing");
        // each listener exceeding max depth should emit "]"
        //this.stringListeners.filter(listener => listener.depth >= listener.path.length-1).forEach(listener => {
        //    listener.observer.next("]");
        //    if(listener.depth === listener.path.length && listener.arrayDepth === 1) {
        //        listener.observer.complete();
        //    }
        //});
        // always emit
        this.stringListeners.forEach(listener => {
            listener.observer.next("]");
        });
        // all listeners should be decremented
        this.stringListeners.forEach(listener => {
            if (listener.arrayDepth) {
                listener.arrayDepth--;
                if (listener.arrayDepth === 0 && listener.depth <= listener.path.length - 1) { // the second condition shouldn't be possible but I'm not touching it
                    listener.observer.complete();
                }
            }
            else {
                // this shouldn't happen
                throw new Error("array depth is 0 - did you close more brackets than you opened?");
            }
        });
        // object listeners never emit. but if they did, this is what it would look like:
        // // object listeners with path.length = 0 would emit arraySoFar
        // this.objectListeners.forEach(listener => {
        //     if(listener.path.length === 0) {
        //         listener.observer.next(this.arraySoFar);
        //     }
        // });
        // all listeners should be decremented
        this.objectListeners.forEach(listener => {
            if (listener.arrayDepth) {
                listener.arrayDepth--;
                if (listener.arrayDepth === 0) {
                    listener.observer.complete();
                }
            }
            else {
                // this shouldn't happen
                throw new Error("array depth is 0 - did you close more brackets than you opened?");
            }
        });
    }
}
class SubObjectParser {
    /** Transitions
     * START -> BEFORE_KEY // eg.: { followed by whitespace until key
     * BEFORE_KEY -> BEGIN_KEY
     * BEGIN_KEY -> KEY // "
     * KEY -> END_KEY // "
     * END_KEY -> BEFORE_COLON // whitespace until :
     * BEFORE_COLON -> COLON // :
     * COLON -> BEFORE_VALUE // whitespace until value
     * BEFORE_VALUE -> BEGIN_VALUE
     * BEGIN_VALUE -> OBJECT // {
     * BEGIN_VALUE -> ARRAY // [
     * BEGIN_VALUE -> STRING // "
     * BEGIN_VALUE -> NUMBER // 1
     * AFTER_VALUE -> AFTER_VALUE // whitespace until , or }
     * AFTER_VALUE -> BEFORE_KEY // whitespace until key
     * AFTER_VALUE -> END // }
     *
     * if trailing commas are allowed, we can have a comma after the last value
     * BEFORE_KEY -> END // }
     *
     */
    constructor(parent, stringListeners, objectListeners) {
        this.parent = parent;
        this.stringListeners = stringListeners;
        this.objectListeners = objectListeners;
        this.mode = START;
        this.objectSoFar = {};
        this.currentKey = "";
        // local object listeners are object listeners where path.length = 0
        this.localObjectListeners = this.objectListeners.filter(listener => listener.path.length === 0);
        // these should be filtered out from objectlisteners
        this.objectListeners = this.objectListeners.filter(listener => listener.path.length > 0);
    }
    // receive a value from below
    __push(chunk) {
        chunkDigest: while (chunk) {
            switch (this.mode) {
                case START: {
                    // expect {
                    if (chunk[0] !== "{") {
                        throw new Error("unexpected character");
                    }
                    this.mode = BEFORE_KEY;
                    // for string listeners meeting or exceeding max depth, emit "{"
                    this.stringListeners.filter(listener => listener.depth >= listener.path.length).forEach(listener => {
                        listener.observer.next("{");
                    });
                    chunk = chunk.slice(1);
                    continue chunkDigest;
                }
                case BEFORE_KEY: {
                    // trim all beginning whitespace
                    chunk = trimStart(chunk);
                    if (!chunk)
                        return this;
                    // expect "
                    if (chunk[0] !== '"') {
                        // in this case, there might also be a }
                        if (chunk[0] === "}") {
                            this.mode = END;
                            this.__close();
                            return this.parent.__pass(chunk, this.objectSoFar);
                        }
                        throw new Error("unexpected character");
                    }
                    // we expect a key, use the string parser and enter key mode
                    this.mode = KEY;
                    // determine listeners
                    const stringListeners = this.stringListeners.filter(listener => listener.depth >= listener.path.length);
                    stringListeners.forEach(listener => { listener.depth++; });
                    const parser = new SubStringParser(this, stringListeners);
                    return parser.__push(chunk);
                }
                case BEFORE_COLON: {
                    // we expect a colon
                    chunk = trimStart(chunk);
                    if (!chunk)
                        return this;
                    if (chunk[0] !== ":") {
                        throw new Error("unexpected character, expected colon");
                    }
                    this.mode = BEFORE_VALUE;
                    // for string listeners meeting or exceeding max depth, emit ":"
                    this.stringListeners.filter(listener => listener.depth >= listener.path.length).forEach(listener => {
                        listener.observer.next(":");
                    });
                    return this.__push(chunk.slice(1));
                }
                case BEFORE_VALUE: {
                    // we expect a value
                    chunk = trimStart(chunk);
                    if (!chunk)
                        return this;
                    // determine listeners
                    const stringListeners = this.stringListeners.filter(listener => listener.depth >= listener.path.length
                        || listener.path[listener.depth] === this.currentKey);
                    stringListeners.forEach(listener => { listener.depth++; });
                    // object listeners need to be exact, and then path trimmed
                    const objectListeners = this.objectListeners.filter(listener => listener.path[0] === this.currentKey).map(listener => {
                        return { path: listener.path.slice(1), observer: listener.observer, arrayDepth: listener.arrayDepth };
                    });
                    switch (chunk[0]) {
                        case "{": {
                            this.mode = OBJECT;
                            const parser = new SubObjectParser(this, stringListeners, objectListeners);
                            return parser.__push(chunk);
                        }
                        case "[": {
                            this.mode = ARRAY;
                            const parser = new SubArrayParser(this, stringListeners, objectListeners);
                            return parser.__push(chunk);
                        }
                        case '"': {
                            this.mode = STRING;
                            const parser = new SubStringParser(this, stringListeners, objectListeners);
                            return parser.__push(chunk);
                        }
                        default: {
                            this.mode = NUMBER;
                            const parser = new SubNumberParser(this, stringListeners, objectListeners);
                            return parser.__push(chunk);
                        }
                    }
                }
                case AFTER_VALUE: {
                    // we're done with the last object, so we expect a comma or a closing bracket, or whitespace
                    chunk = trimStart(chunk);
                    if (!chunk)
                        return this;
                    switch (chunk[0]) {
                        case ",": {
                            this.mode = BEFORE_KEY;
                            chunk = chunk.slice(1);
                            // for string listeners meeting or exceeding max depth, emit ","
                            this.stringListeners.filter(listener => listener.depth >= listener.path.length).forEach(listener => {
                                listener.observer.next(",");
                            });
                            continue chunkDigest;
                        }
                        case "}": {
                            this.__close();
                            return this.parent.__pass(chunk.slice(1), this.objectSoFar);
                        }
                        case '"':
                            {
                                // quirk: if LLM forgets comma but decides to continue with a key
                                if (!objectCommaSeparatorRequired) {
                                    this.mode = BEFORE_KEY;
                                    // for string listeners meeting or exceeding max depth, emit ","
                                    this.stringListeners.filter(listener => listener.depth >= listener.path.length).forEach(listener => {
                                        listener.observer.next(",");
                                    });
                                    continue chunkDigest;
                                    // pass to default
                                }
                                else {
                                    throw new Error("unexpected character after value in object (comma required) : " + chunk[0]);
                                }
                            }
                        default: {
                            throw new Error("unexpected character after value in object (numbers not allowed) : " + chunk[0]);
                        }
                    }
                    /*
                    if(chunk[0] === ",") {
                        this.mode = BEFORE_KEY;
                        chunk = chunk.slice(1);
                        continue chunkDigest;
                    } else if(chunk[0] === "}") {
                        this.__close();
                        return this.parent.__pass(chunk.slice(1), this.objectSoFar);
                    } else {
                        throw new Error("unexpected character after value in object : " + chunk[0]);
                    }
                    */
                }
                default:
                    throw new Error("unexpected state in object parser: " + this.mode.toString());
            }
        }
        return this; // empty chunk, waiting for more
    }
    // receive a value from above
    __pass(chunk, result) {
        if (this.mode === KEY) {
            this.currentKey = result;
            this.mode = BEFORE_COLON;
            return this.__push(chunk);
        }
        else {
            this.mode = AFTER_VALUE;
            this.objectSoFar[this.currentKey] = result;
            this.__emitDelta(result);
            return this.__push(chunk);
        }
    }
    __emitDelta(delta) {
        console.warn("not implemented!");
        console.log("emission:", delta);
    }
    __close() {
        // each listener exceeding max depth should emit "}"
        this.stringListeners.filter(listener => listener.depth >= listener.path.length).forEach(listener => {
            listener.observer.next("}");
            if (listener.depth === listener.path.length && !listener.arrayDepth) {
                listener.observer.complete();
            }
        });
        // all listeners should be decremented
        this.stringListeners.forEach(listener => {
            listener.depth--;
        });
        // all local objectlisteners where path length = 0 should emit objectSoFar
        this.localObjectListeners.forEach(listener => {
            listener.observer.next(this.objectSoFar);
        });
        // and if there's no array in the parent path, they should close out
        this.localObjectListeners.forEach(listener => {
            if (!listener.arrayDepth) {
                listener.observer.complete();
            }
        });
    }
}
class SubNumberParser {
    // this is a permissive number parser.
    // a number can contain +, -, ., e, E, 0-9 in any order. we don't check for validity of the number.
    /** Transitions
     * START -> NUMBER // number can be anything other than whitespace, comma, ] or }. there is no whitespace at the start.
     * NUMBER -> NUMBER // keep appending to the number
     * NUMBER -> END // end must be whitespace or , or ] or }
     */
    constructor(parent, stringListeners, objectListeners) {
        this.parent = parent;
        this.stringListeners = stringListeners;
        this.objectListeners = objectListeners;
        this.numberSoFar = "";
        this.mode = START;
        this.numberMatch = /^[-+.eE0-9]+/;
        // make sure that all stringListeners are at max depth. warn those that aren't
        this.stringListeners.filter(listener => listener.depth < listener.path.length).forEach(listener => {
            warnOutOfScope("string listener at path " + listener.path.join(".") + " is out of scope");
        });
        this.stringListeners = this.stringListeners.filter(listener => listener.depth >= listener.path.length);
    }
    // receive a value from below
    __push(chunk) {
        chunkDigest: while (chunk) {
            switch (this.mode) {
                case START: {
                    // make sure it starts with a number
                    const chunkMatch = chunk.match(this.numberMatch);
                    if (!chunkMatch) {
                        throw new Error("unexpected character, expected number (0-9, +, -, ., e, E)");
                    }
                    this.mode = NUMBER;
                    this.numberSoFar = chunkMatch[0];
                    this.__emitDelta(chunkMatch[0]);
                    chunk = chunk.slice(chunkMatch[0].length);
                    continue chunkDigest;
                }
                case NUMBER: {
                    // we split the chunk into two parts: the number part and the rest.
                    // we take the number part and emit it, and subtract it from the chunk. if the number part is empty, we pass back to parent
                    const numberPart = chunk.match(this.numberMatch);
                    if (!numberPart) {
                        this.mode = END;
                        this.__close();
                        return this.parent.__pass(chunk, this.numberSoFar);
                    }
                    this.numberSoFar += numberPart[0];
                    this.__emitDelta(numberPart[0]);
                    chunk = chunk.slice(numberPart[0].length);
                    continue chunkDigest;
                }
                default:
                    throw new Error("unexpected state in number parser: " + this.mode.toString());
            }
        }
        return this; // empty chunk
    }
    // receive a value from above
    __pass(chunk) {
        // this can't happen because number parser can't have children
        throw new Error("unexpected state in number parser");
    }
    __emitDelta(chunk) {
        console.warn("not implemented!");
        console.log("emission:", chunk);
    }
    __close() {
        // if isn't numeric: 
        // - emit as quoted string to all listeners exceeding max depth
        // - emit as raw string to all listeners at max depth
        // if is numeric:
        // - emit to all listeners as number
        if (isNaN(+this.numberSoFar)) {
            // if it's not a number, we emit it as a string
            this.stringListeners.filter(listener => listener.depth > listener.path.length).forEach(listener => {
                listener.observer.next('"' + this.numberSoFar + '"');
            });
            this.stringListeners.filter(listener => listener.depth === listener.path.length).forEach(listener => {
                listener.observer.next(this.numberSoFar);
            });
        }
        else {
            // if it's a number, we emit it as a number
            this.stringListeners.forEach(listener => {
                listener.observer.next(this.numberSoFar);
            });
        }
        // all listeners at max depth should close out, as long as there's no array in the parent path
        this.stringListeners.filter(listener => !listener.arrayDepth
            && listener.depth === listener.path.length).forEach(listener => {
            listener.observer.complete();
        });
        // all listeners should be decremented
        this.stringListeners.forEach(listener => {
            listener.depth--;
        });
        // objectlisteners, if their path length is 0, should emit the number (as a number type, as string otherwise)
        this.objectListeners.forEach(listener => {
            if (listener.path.length === 0) {
                if (isNaN(+this.numberSoFar)) {
                    listener.observer.next(this.numberSoFar);
                }
                else {
                    listener.observer.next(+this.numberSoFar);
                }
            }
        });
        // and if there's no array in the parent path, they should close out
        this.objectListeners.forEach(listener => {
            if (!listener.arrayDepth) {
                listener.observer.complete();
            }
        });
        // and if the path length is greater than 0, the out of scope warning should be emitted
        this.objectListeners.filter(listener => listener.path.length > 0).forEach(listener => {
            warnOutOfScope("object listener at path " + listener.path.join(".") + " is out of scope");
        });
    }
}
class SubStringParser {
    /** Transitions
     * START -> STRING // start must be ", then we're in a string
     * STRING -> STRING // keep appending to the string, allow anything other than \".
     * STRING -> END // end must be unescaped "
     */
    constructor(parent, stringListeners, objectListeners = []) {
        this.parent = parent;
        this.stringListeners = stringListeners;
        this.objectListeners = objectListeners;
        this.stringSoFar = "";
        this.mode = START;
        this.escapecounter = 0;
        // make sure that all stringListeners are at max depth. warn those that aren't
        this.stringListeners.filter(listener => listener.depth < listener.path.length).forEach(listener => {
            warnOutOfScope("string listener at path " + listener.path.join(".") + " is out of scope");
        });
        this.stringListeners = this.stringListeners.filter(listener => listener.depth >= listener.path.length);
        // those deeper than max depth should emit '"'
        this.stringListeners.filter(listener => listener.depth > listener.path.length || listener.arrayDepth).forEach(listener => {
            listener.observer.next('"');
        });
    }
    // receive a value from below
    __push(chunk) {
        chunkDigest: while (chunk) {
            switch (this.mode) {
                case START: {
                    if (chunk[0] !== '"') {
                        throw new Error("unexpected character, expected double quote to start string");
                    }
                    this.mode = STRING;
                    chunk = chunk.slice(1);
                    continue chunkDigest;
                }
                case STRING: {
                    // if chunk is empty, just return. there might be more to come
                    if (!chunk) {
                        return this;
                    }
                    if (chunk[0] === '"' && this.escapecounter % 2 === 0) {
                        this.mode = END;
                        this.__close();
                        return this.parent.__pass(chunk.slice(1), this.stringSoFar);
                    }
                    else if (chunk[0] === '"') {
                        // in this case, we have an escaped quote, we treat it as a normal character and reset the counter
                        this.escapecounter = 0;
                        this.stringSoFar += '"';
                        this.__emitDelta('"');
                        chunk = chunk.slice(1);
                        continue chunkDigest;
                    }
                    // we check if there's a quote in the chunk
                    const quoteIndex = chunk.indexOf('"');
                    if (quoteIndex === -1) {
                        // if there's no quote in the chunk, we just add the whole chunk to the string and return
                        this.stringSoFar += chunk;
                        this.__emitDelta(chunk);
                        return this;
                    }
                    // we split it. we know that the first part is a string
                    const prior = chunk.slice(0, quoteIndex);
                    this.stringSoFar += prior;
                    this.__emitDelta(prior);
                    chunk = chunk.slice(quoteIndex);
                    // before we continue, we count the number of trailing backslashes
                    const trailingBackslashes = prior.match(/\\+$/);
                    const trailingBackslashCount = trailingBackslashes ? trailingBackslashes[0].length : 0;
                    // if we have backslashes
                    if (trailingBackslashCount) {
                        // if the whole prior is backslashes, we add it to the counter. otherwise, we reset it
                        if (trailingBackslashCount === prior.length) {
                            this.escapecounter += trailingBackslashCount;
                        }
                        else {
                            this.escapecounter = 0;
                        }
                    }
                    continue chunkDigest;
                }
                default:
                    throw new Error("unexpected state in string parser: " + this.mode.toString() + " with chunk: " + chunk);
            }
        }
        return this; // empty chunk
    }
    // receive a value from above
    __pass(chunk) {
        // this can't happen because string parser can't have children
        throw new Error("unexpected state in string parser");
    }
    __emitDelta(chunk) {
        console.warn("not implemented!");
        console.log("emission:", chunk);
        this.stringListeners.forEach(listener => {
            listener.observer.next(chunk);
        });
    }
    __close() {
        // each listener exceeding max depth should emit '"'
        this.stringListeners.filter(listener => listener.depth > listener.path.length || listener.arrayDepth).forEach(listener => {
            listener.observer.next('"');
        });
        // all listeners at max depth should close out, as long as there's no array in the parent path
        this.stringListeners.filter(listener => !listener.arrayDepth
            && listener.depth === listener.path.length).forEach(listener => {
            listener.observer.complete();
        });
        // all listeners should be decremented
        this.stringListeners.forEach(listener => {
            listener.depth--;
        });
        // objectlisteners, if their path length is 0, should emit the string
        this.objectListeners.forEach(listener => {
            if (listener.path.length === 0) {
                listener.observer.next(this.stringSoFar);
            }
        });
        // and if there's no array in the parent path, they should close out
        this.objectListeners.forEach(listener => {
            if (!listener.arrayDepth) {
                listener.observer.complete();
            }
        });
    }
}
function trimStart(chunk) {
    // remove any whitespace, tabs, etc. from the start of the chunk
    return chunk.replace(/^\s+/, "");
}
class Subject {
    constructor() {
        this.observers = [];
        this._closed = false;
    }
    subscribe(observer) {
        this.observers.push(observer);
        return {
            unsubscribe: () => {
                const index = this.observers.indexOf(observer);
                if (index !== -1) {
                    this.observers.splice(index, 1);
                }
            }
        };
    }
    get closed() {
        return this._closed;
    }
    next(value) {
        if (this.closed)
            return;
        this.observers.forEach(observer => observer.next(value));
    }
    error(error) {
        if (this.closed)
            return;
        this._closed = true;
        this.observers.forEach(observer => observer.error(error));
    }
    complete() {
        if (this.closed)
            return;
        this._closed = true;
        this.observers.forEach(observer => observer.complete());
    }
}
exports.Subject = Subject;
function warnOutOfScope(message) {
    if (outOfScopeWarnings) {
        console.warn(message);
    }
}
//# sourceMappingURL=index.js.map