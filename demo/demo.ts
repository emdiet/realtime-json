import { RealtimeJSONParser } from "..";
import { generator } from "../test/test";
import { Observable, Observer } from "../types/observable";

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


// get inputs
const input1 = document.getElementById("input1") as HTMLInputElement;
const output1 = document.getElementById("output1") as HTMLDivElement;
const status1 = document.getElementById("status1") as HTMLSpanElement;

const input2 = document.getElementById("input2") as HTMLInputElement;
const output2 = document.getElementById("output2") as HTMLDivElement;
const status2 = document.getElementById("status2") as HTMLSpanElement;

const input3 = document.getElementById("input3") as HTMLInputElement;
const output3 = document.getElementById("output3") as HTMLDivElement;
const status3 = document.getElementById("status3") as HTMLSpanElement;

const input4 = document.getElementById("input4") as HTMLInputElement;
const output4 = document.getElementById("output4") as HTMLDivElement;
const status4 = document.getElementById("status4") as HTMLSpanElement;

const input5 = document.getElementById("input5") as HTMLInputElement;
const output5 = document.getElementById("output5") as HTMLDivElement;
const status5 = document.getElementById("status5") as HTMLSpanElement;

const input6 = document.getElementById("input6") as HTMLInputElement;
const output6 = document.getElementById("output6") as HTMLDivElement;
const status6 = document.getElementById("status6") as HTMLSpanElement;


let cancelGenerator = () => {};
start!.onclick = () => {
    // cancel the previous generator
    cancelGenerator();
    let canceled = false;
    cancelGenerator = () => canceled = true


    // load the data from the textarea
    const input = textinput!.value;

    // set total to input length
    total!.innerText = input.length.toString();

    const {output, poke, isDone, _getProgress} = generator(input);
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

    // input1
    status1.textContent = "Loading";
    realtimeParser.observeStream(input1.value).subscribe({
        next: (value) => {
            output1.textContent += value;
            status1.textContent = "Active";
        },
        error: (error) => {
            console.error(error);
            output1.textContent = error.message;
            status1.textContent = "Error";
        },
        complete: () => {
            console.log("done");
            status1.textContent = "Done";
        }
    });

    // input2
    status2.textContent = "Loading";
    realtimeParser.observeStream(input2.value).subscribe({
        next: (value) => {
            output2.textContent += value;
            status2.textContent = "Active";
        },
        error: (error) => {
            console.error(error);
            output2.textContent = error.message;
            status2.textContent = "Error";
        },
        complete: () => {
            console.log("done");
            status2.textContent = "Done";
        }
    });

    // input3
    status3.textContent = "Loading";
    realtimeParser.observeStream(input3.value).subscribe({
        next: (value) => {
            output3.textContent += value;
            status3.textContent = "Active";
        },
        error: (error) => {
            console.error(error);
            output3.textContent = error.message;
            status3.textContent = "Error";
        },
        complete: () => {
            console.log("done");
            status3.textContent = "Done";
        }
    });

    // input4
    status4.textContent = "Loading";
    realtimeParser.observeStream(input4.value).subscribe({
        next: (value) => {
            output4.textContent += value;
            status4.textContent = "Active";
        },
        error: (error) => {
            console.error(error);
            output4.textContent = error.message;
            status4.textContent = "Error";
        },
        complete: () => {
            console.log("done");
            status4.textContent = "Done";
        }
    });

    // input5
    status5.textContent = "Loading";
    realtimeParser.observeStream(input5.value).subscribe({
        next: (value) => {
            output5.textContent += value;
            status5.textContent = "Active";
        },
        error: (error) => {
            console.error(error);
            output5.textContent = error.message;
            status5.textContent = "Error";
        },
        complete: () => {
            console.log("done");
            status5.textContent = "Done";
        }
    });

    // input6
    status6.textContent = "Loading";
    realtimeParser.observeStream(input6.value).subscribe({
        next: (value) => {
            output6.textContent += value;
            status6.textContent = "Active";
        },
        error: (error) => {
            console.error(error);
            output6.textContent = error.message;
            status6.textContent = "Error";
        },
        complete: () => {
            console.log("done");
            status6.textContent = "Done";
        }
    });
    



    const frame = () => {
        if(isDone() || canceled) return;

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

    // find all divs class output and remove their textcontent
    document.querySelectorAll(".output").forEach(div => div.textContent = "");
    document.querySelectorAll(".status").forEach(span => span.textContent = "unk");
}






