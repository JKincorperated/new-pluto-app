#!/usr/bin/env node
import { input } from '@inquirer/prompts';
import select from '@inquirer/select';
import { checkbox } from '@inquirer/prompts';
import confirm from '@inquirer/confirm';
import { parseArgs } from "node:util";

import * as jsApp from "./jsApp.js";

const args = parseArgs({
    allowPositionals: true,
});

if (args.positionals.length > 1) {
    console.error('Invalid arguments');
    process.exit(1);
}

var target;

if (args.positionals.length == 0) {
    target = process.cwd();
} else {
    target = args.positionals[0];
}

const moduleType = "JS";

const appType = await select({
    message: 'Select type of application',
    choices: [
        {
            name: 'Process',
            value: 'process',
            description: 'A default program, use this if unsure of what to pick.',
        },
        {
            name: "Library",
            value: 'library',
            description: 'A library for another module to use.',
        },

    ],
});

const perm = await checkbox({
    message: 'What permissions does your app need?',
    choices: [
        { name: 'Start other applications', value: 'startPkg' },
        { name: 'Interface with other running processes', value: 'processList' },
        { name: 'Read installed programs', value: 'knownPackageList' },
        { name: 'Interact with system services', value: 'services' },
        { name: 'Full core access', value: 'full' }
    ],
});

let perms = []

for (const val of perm) {
    switch (val) {
        case 'startPkg':
            perms.push({
                privilege: "startPkg",
                description: await input({ message: 'Reason for start access: ' })
            })
            break;
        case 'processList':
            perms.push({
                privilege: "processList",
                description: await input({ message: 'Reason for interacting with processes: ' })
            })
            break;
        case 'knownPackageList':
            perms.push({
                privilege: "knownPackageList",
                description: await input({ message: 'Reason for reading installed packages: ' })
            })
            break;
        case 'services':
            perms.push({
                privilege: "services",
                description: await input({ message: 'Reason for services access: ' })
            })
            break;
        case 'full':
            perms.push({
                privilege: "full",
                description: await input({ message: 'Reason for Core Access: ' })
            })
            break;
    }
}

const name = await input({ message: 'Enter app name: ' });
const description = await input({ message: 'Enter app description: ' });

var entry, event;

if (await confirm({ message: 'Specify a custom main entry point?', default: false })) {
    entry = await input({ message: 'Enter custom entry point function: ' });
}
else {
    entry = 'main';
}

if (await confirm({ message: 'Recieve events?', default: false })) {
    event = await input({ message: 'What function should recive events? ' });
}
else {
    event = null;
}

if (!(await confirm({ message: 'Are these all correct?', default: true }))) {
    console.warn("Aborted.")
    process.exit(1);
}

if (moduleType == 'JS') {
    jsApp.make(target, name, description, entry, event, appType, perms)
} else if (moduleType == 'TS') {
    tsApp.make(target, name, description, entry, event, appType, perms)
} else if (moduleType == 'WASM') {
    console.warn("WASM is not yet supported.")
}