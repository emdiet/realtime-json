# RealtimeJSONParser
<sub>Readme generated by LLM</sub>

This TypeScript library implements a realtime JSON parser which allows for the streaming of JSON data, and observing specific paths within that JSON data stream. The parser is designed to handle JSON data incrementally, which can be especially useful when dealing with large JSON files or streams, such as Large Language Model (LLM) output from GPT-4.

[nested object playground](https://emdiet.github.io/realtime-json/demo/demo.html) | [story playground](https://emdiet.github.io/realtime-json/demo/demo_story.html)
--|-- 
![realtime-json](https://github.com/emdiet/realtime-json/assets/6719169/45ef3fab-f589-4174-aab6-3b78c1d3ac6c) | ![realtime-story](https://github.com/emdiet/realtime-json/assets/6719169/162fa143-3dcd-40f2-9799-b3834a7e322e)

## Features

- **Real-time Parsing:** Parses JSON data in real-time as it is received, making it ideal for streaming applications.
- **Observables:** Utilizes observables to allow subscribers to listen for changes or specific data within the JSON structure.
- **Dynamic Sub-Parsing:** Dynamically delegates parsing responsibilities to specialized sub-parsers depending on the context within the JSON data (objects, arrays, strings, numbers).
- **Error Handling:** Robust error handling capabilities, providing detailed information about parsing errors and allowing for graceful recovery or termination of parsing.

For your convenience, this lib is also available as a JS file. 

## Installation

To include this parser in your project, simply copy the provided TypeScript files into your project directory.

Ensure that you have TypeScript configured and that you are able to import files as modules.

## Usage

Here is a basic example of how to use the Realtime JSON Parser to stream and parse JSON data:

Copy the index.ts or index.js into your project,

```typescript
import { RealtimeJSONParser, Subject } from "./path to file.ts";

// Create a new Observable stream
const jsonStream = new Subject<string>(); // or use RxJs or similar observables

// Instantiate the RealtimeJSONParser with the JSON stream
const parser = new RealtimeJSONParser(jsonStream);

// Subscribe to a specific path in the JSON data
const subscription = parser.observeStream("path.to.element").subscribe({
    next: (data) => console.log("Data:", data),
    error: (error) => console.error("Error:", error),
    complete: () => console.log("Stream completed"),
});

// Push JSON data into the stream (this would typically be done incrementally in a real application)
jsonStream.next('{"path": {"to": {"element": "value"}}}');

// Close the stream when done
jsonStream.complete();
```

For more examples, see the demo folder.

## Observing Data

The parser allows you to observe either specific fields within the JSON data or the entire JSON object by providing a query path. Paths can be specified as a dot-separated string (e.g., `"user.details.name"`) or as an array of strings (e.g., `["user", "details", "name"]`).

## Handling Errors and Completion

The parser and the observable streams provide mechanisms for error handling and completion, ensuring that you can manage the lifecycle of the stream effectively.

## Contributing

Contributions to the Realtime JSON Parser are welcome. Please feel free to fork the repository, make changes, post issues, and submit pull requests.

## Future Plans

- [ ] make a proper package
- [ ] auto-port to python
- [ ] add XML support
