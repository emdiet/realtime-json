import { RealtimeJSONParser } from "..";
import { generator } from "../test/test";

const newlinespretty = true;

// get the textarea with id textinput
const textinput = document.getElementById("textinput") as HTMLTextAreaElement;

// get the button with id start
const start = document.getElementById("btnStart");

// get the button with id reset
const reset = document.getElementById("btnReset");

// get the span with id cursor
const cursor = document.getElementById("cursor");
// get the span with id total
const total = document.getElementById("total");



let cancelGenerator = () => { };
start!.onclick = () => {
    // cancel the previous generator
    cancelGenerator();
    let canceled = false;
    cancelGenerator = () => canceled = true


    // load the data from the textarea
    const input = textinput!.value;

    // set total to input length
    total!.innerText = input.length.toString();

    const { output, poke, isDone, _getProgress } = generator(input);
    const realtimeParser = new RealtimeJSONParser(output);

    output.subscribe({
        next: (value) => {
            // append the value to the div with id output
            console.log("value", value);
        },
        error: (error) => {
            console.error(error);
        },
        complete: () => {
            console.log("done");
        }
    });

    // observers
    // grab all divs with class "observer" and foreach...
    document.querySelectorAll(".observer").forEach(div => {
        // grab the input element inside the div
        const input = div.querySelector("input.query") as HTMLInputElement;
        // grab the output elements inside the div
        const output_string = div.querySelector(".output .string") as HTMLDivElement;
        const output_object = div.querySelector(".output .object") as HTMLDivElement;
        // grab the status element inside the div
        const status_string = div.querySelector(".status.string") as HTMLSpanElement;
        const status_object = div.querySelector(".status.object") as HTMLSpanElement;

        // grab the stingEnable and objectEnable checkbox values
        const stringEnable = div.querySelector("input.stringEnable") as HTMLInputElement;
        const objectEnable = div.querySelector("input.objectEnable") as HTMLInputElement;

        // set the status to waiting
        status_string.textContent = "Waiting";
        status_object.textContent = "Waiting";

        if (stringEnable?.checked) {
            // observe the input as strings
            let knowBackSlash = false;
            realtimeParser.observeStream(input.value).subscribe({
                next: (value) => {


                    // make newlines prettier
                    if (newlinespretty) {
                        // if we have a backslash from previous value, add it to this value
                        if (knowBackSlash) {
                            value = "\\" + value;
                            knowBackSlash = false;
                        }
                        // replace all \n with <br>
                        value = value.replace(/\\n/g, "\n");
                        // if last character is a backslash
                        if (value[value.length - 1] === "\\") {
                            knowBackSlash = true;
                            value = value.slice(0, -1);
                        } else {
                            knowBackSlash = false;
                        }
                    }


                    output_string.textContent += value;
                    status_string.textContent = "Active";

                },
                error: (error) => {
                    console.error(error);
                    output_string.textContent = error.message;
                    status_string.textContent = "Error";
                },
                complete: () => {
                    // make newlines prettier
                    if (newlinespretty) {
                        // if we have a dangling backslash, add it
                        if (knowBackSlash) {
                            output_string.textContent += "\\";
                        }
                    }

                    console.log("done");
                    status_string.textContent = "Done";
                }
            });
        }

        if (objectEnable?.checked) {
            // observe the input as objects
            realtimeParser.observeObjects(input.value).subscribe({
                next: (value) => {
                    output_object.innerHTML += `<div class="obj">${JSON.stringify(value, null, 4)}</div>`;
                    status_object.textContent = "Active";
                },
                error: (error) => {
                    console.error(error);
                    output_object.textContent = error.message;
                    status_object.textContent = "Error";
                },
                complete: () => {
                    console.log("done");
                    status_object.textContent = "Done";
                }
            });
        }
    });


    const frame = () => {
        if (isDone() || canceled) return;

        poke();

        // set cursor to _getProgress
        cursor!.innerText = _getProgress().toString();

        requestAnimationFrame(frame);
    }
    frame();

}

reset!.onclick = () => {
    cancelGenerator();
    cursor!.innerText = "0";
    total!.innerText = "0";

    // clear all outputs
    document.querySelectorAll(".output .status.string").forEach(div => div.textContent = "unk");
    document.querySelectorAll(".output .status.object").forEach(div => div.textContent = "unk");
    document.querySelectorAll(".output .string").forEach(div => div.textContent = "");
    document.querySelectorAll(".output .object").forEach(div => div.textContent = "");

}






