import ora from 'ora';
import * as fs from 'fs';
import { execSync } from 'node:child_process';

export function make(target, name, description, entry, event, appType, perms) {
  // verify target is a directory
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  const spinner = ora('Creating file structure...').start();
  spinner.color = 'yellow';

  fs.mkdirSync(target + '/src');
  fs.mkdirSync(target + '/build');

  spinner.text = 'Writing package.json';
  fs.writeFileSync(target + '/package.json', JSON.stringify({
    "name": name,
    "version": "",
    "description": description,
    "main": "index.js",
    "scripts": {
      "build": "node build.js && rollup ./build/entry.js --file ./build/plugin.js --format es && terser ./build/plugin.js --compress --module > plugin.js"
    },
    "keywords": [],
    "author": "",
    "license": "MIT",
    "dependencies": {
      "rollup": "^4.12.0",
      "terser": "^5.27.2"
    },
    "type": "module"
  }));

  spinner.text = 'Writing app.json';

  fs.writeFileSync(target + '/app.json', JSON.stringify({
    "entry_point": entry,
    "eventEntry": event,
    "name": name,
    "description": description,
    "type": appType,
    "privileges": perms
  }));

  spinner.text = 'Writing JSDoc File';

  fs.writeFileSync(target + '/_types.js', `
/**
 * Root Interface.
 * @typedef {Object} Root
 * @property {Object} Lib
 * @property {Function} Lib.getProcessList - Function to get the process list.
 * @property {Function} Lib.getString - Async function to retrieve a string given a title and description.
 * @property {Html} Lib.html - An Html class.
 * @property {Icons} Lib.icons - A collection of icons.
 * @property {string[]} Lib.langs - An array of language strings.
 * @property {Function} Lib.launch - Async function to launch an application with an optional parent.
 * @property {Function} Lib.loadComponent - Async function to load a component.
 * @property {Function} Lib.loadLibrary - Async function to load a library.
 * @property {Function} Lib.onEnd - Function called at end of a process.
 * @property {Function} Lib.onEndCallback - Function to execute as an end callback.
 * @property {Function} Lib.randomString - Function to generate a random string.
 * @property {Function} Lib.setOnEnd - Function to set the end callback function.
 * @property {Function} Lib.setupReturns - Function to setup message returns and tray information.
 * @property {Object} Lib.systemInfo - System information object.
 * @property {number} Lib.systemInfo.version - Version number.
 * @property {string} Lib.systemInfo.versionString - Version as a readable string.
 * @property {string} Lib.systemInfo.codename - System codename.
 * @property {Function} Lib.updateProcDesc - Function to update the process description.
 * @property {Function} Lib.updateProcTitle - Function to update the process title.
 *
 * @property {Core|null} Core - Core object or null.
 * @property {number} PID - Process identifier.
 * @property {string} Token - Security token.
 * @property {null} Services - Services placeholder, currently null.
 * @property {Object} Modal
 * @property {Function} Modal.modal - Async function to create a custom modal.
 * @property {Function} Modal.alert - Async function to display an alert modal.
 * @property {Function} Modal.prompt - Async function to display a prompt modal.
 * @property {Function} Modal.input - Async function to display an input modal.
*/
`);

  spinner.text = 'Writing build.js';
  fs.writeFileSync(target + '/build.js', `
import fs from "fs"

import { readFile } from 'fs/promises';
const config = JSON.parse(
  await readFile(
    new URL('./app.json', import.meta.url)
  )
);

if (!fs.existsSync("./build")) {
  fs.mkdirSync("./build");
}

let events = config.eventEntry;

let x = "";

if (config.privileges.length !== 0) {
  x = \`"privileges": \` + JSON.stringify(config.privileges) + \`,\`
}

if (!events) {
  events = false;
  fs.writeFileSync("./build/entry.js", "import {" + config.entry_point + \`} from '../src/index.js';
  export default {
      "exec": \` + config.entry_point + \`,
      "name": "\` + config.name + \`",
      "description":" \` + config.description + \`",
      "ver": 1,
      "type": "\` + config.type + \`",
      "optInToEvents": false,
      \` + x + \`
  }\`)
} else {
  fs.writeFileSync("./build/entry.js", "import {" + config.entry_point + \`} from '../src/index.js';
  import { \` + events + \` } from '../src/index.js';
  export default {
    "exec": async (root) => {
      await \` + config.entry_point + \`(root);
      return root.Lib.setupReturns((m) => {
        const { type, data } = m;
        \` + events + \`(type, data);
      });
    },
    "name": "\` + config.name + \`",
    "description":" \` + config.description + \`",
    "ver": 1,
    "type": "\` + config.type + \`",
    "optInToEvents": true,
    \` + x + \`
}\`)
}
`);

  spinner.text = 'Writing src/index.js';

  let addCode = "";

  if (event) {
    addCode = `
export function ${event}(type, data) {
    console.log(type, data);
}
    `
  }

  fs.writeFileSync(target + '/src/index.js', `
/**
 * @param {Root} Root The root interface. See https://github.com/zeondev/pluto/blob/main/docs/README.md
*/
export async function ${entry}(Root) {
    let wrapper;
    let MyWindow;

    console.log("Hello from example package", Root.Lib);

    const Win = (await Root.Lib.loadLibrary("WindowSystem")).win;

    MyWindow = new Win({
      title: "Example App",
      content: "Hello",
      pid: Root.PID,
      onclose: () => {
        Root.Lib.onEnd();
      },
    });

    Root.Lib.setOnEnd((_) => MyWindow.close());

    wrapper = MyWindow.window.querySelector(".win-content");

    /* Heading */ new Root.Lib.html("h1").text("Example App").appendTo(wrapper);
    /* Paragraph */ new Root.Lib.html("p")
      .html("Hi welcome to the example app")
      .appendTo(wrapper);
    /* Button */ new Root.Lib.html("button")
      .text("Hello, world")
      .appendTo(wrapper)
      .on("click", (e) => {
        Root.Modal.alert(
          \`Hello!\nCursor Position: \${e.clientX}, \${e.clientY}\nMy PID: \${Root.PID}\nMy Token: \${Root.Token}\`
        );
      });
    /* Close Button */ new Root.Lib.html("button")
      .text("End Process")
      .appendTo(wrapper)
      .on("click", (e) => {
        Root.Lib.onEnd();
      });
}

` + addCode);

  spinner.stop();

  console.log("Installing dependencies...");

  execSync("npm install", { cwd: target });

  console.log(`Done! Now run 'cd ${target} && npm run build' to package your application to a plugin.js file.`);
}