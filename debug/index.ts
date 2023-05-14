

console.log('Starting cleaner test (see index.ts)');
import { Cleaner } from '../src/orm/Cleaner';
testCleaner();
process.exit(0);

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import transformer from '../src/transformer/transformer';

console.log('Starting');
console.log();

const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2020,
    outDir: path.join(__dirname, '..\\out\\sut'),
    sourceMap: true,
    noEmitOnError: true,
    strict: true,
    noImplicitReturns: true,
    noPropertyAccessFromIndexSignature: true,
};

// create compiler host, program, and then emit the results
// using our transform
const compilerHost = ts.createCompilerHost(compilerOptions);

function* walkDirectorySync(dir: string): Generator<string> {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (let i = 0; i < files.length; i++) {
        if (files[i].isDirectory()) {
            yield* walkDirectorySync(path.join(dir, files[i].name));
        } else {
            yield path.join(dir, files[i].name);
        }
    }
}

const rootFiles = [...walkDirectorySync(path.join(__dirname, '..\\..\\debug\\sut'))].filter(f => f.endsWith('.ts'));

const program = ts.createProgram(rootFiles, compilerOptions, compilerHost);
const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    before: [
        transformer(program, {})
    ]
});

if (emitResult.emitSkipped) {
    console.warn('Emit skipped');
}

console.log();
console.log();
console.log();

function testCleaner() {
    const fieldConfig = {
        name: 'library-widget-domains',
        fields: {
            revId: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }],
            },
            revNumber: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'number' }],
            },
            id: { allowUndefined: false, values: [{ type: 'val', value: 'string' }] },
            libraryId: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }],
            },
            created: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'number' }],
            },
            name: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }],
            },
            script: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }],
            },
            scriptValid: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'boolean' }],
            },
            codeIssues: {
                allowUndefined: false,
                values: [
                    {
                        type: 'arr',
                        value: [
                            {
                                type: 'obj',
                                value: {
                                    severity: {
                                        allowUndefined: false,
                                        values: [
                                            { type: 'lit', value: 'error' },
                                            { type: 'lit', value: 'warning' },
                                        ],
                                    },
                                    line: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'number' }],
                                    },
                                    col: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'number' }],
                                    },
                                    message: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
            compiled: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }, { type: 'nil' }],
            },
            methods: {
                allowUndefined: false,
                values: [
                    {
                        type: 'arr',
                        value: [
                            {
                                type: 'obj',
                                value: {
                                    name: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                    returnType: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                    inputs: {
                                        allowUndefined: false,
                                        values: [
                                            {
                                                type: 'arr',
                                                value: [
                                                    {
                                                        type: 'obj',
                                                        value: {
                                                            name: {
                                                                allowUndefined: false,
                                                                values: [
                                                                    {
                                                                        type: 'val',
                                                                        value: 'string',
                                                                    },
                                                                ],
                                                            },
                                                            type: {
                                                                allowUndefined: false,
                                                                values: [
                                                                    {
                                                                        type: 'val',
                                                                        value: 'string',
                                                                    },
                                                                ],
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
        },
    };

    const value = {
        revId: '25d11a1d-7e2a-4c8e-9cf3-30311f97075a',
        revNumber: 4,
        id: '25d11a1d-7e2a-4c8e-9cf3-30311f97075a/4',
        libraryId: '689cd0ff-3aa3-4554-b828-da303e76d59b',
        created: 1684014049085.0,
        name: 'ItemsWidget',
        script:
      '\r\n\r\nexport default class ItemsWidget {\r\n    \r\n    private constructor(private readonly c: mr.IContext) {\r\n\r\n    }\r\n\r\n    public static create(c: mr.IContext): Promise<ItemsWidget> {\r\n        const url = new mr.pageUtil.Url(c.page.url());\r\n        if (url.path !== \'/ui/items\') { throw new Error(\'Page should be on /ui/items\'); }\r\n        return Promise.resolve(new ItemsWidget(c));\r\n    }\r\n\r\n    public async newItem(item: Partial<{\r\n        number: string,\r\n        description: string,\r\n    }>): Promise<void> {\r\n        this.c.log.info(\'Opening new item dialog\');\r\n        this.c.log.debug(\'Getting new item button\');\r\n        const button = await mr.pageUtil.waitForElementByText(this.c.page, \'button\', \'Item\', 10000); //long because the page could still be loading\r\n\r\n        // I think we need to wait for the items grid to finish loading or once it does, it just resets the previous button click. This is easier\r\n        await mr.pageUtil.sleep(1000);\r\n\r\n        this.c.screenCap();\r\n        \r\n        this.c.log.debug(\'Clicking new item button\');\r\n        await button.click();\r\n\r\n        this.c.log.debug(\'Waiting for input\');\r\n        // For some reason there\'s two of these inputs rendered. One with and one without readonly\r\n        const itemNumberInput = await mr.pageUtil.waitForSelector(this.c.page, \'j-input[label="Item Number" i] input:not(:read-only)\', 5000);\r\n\r\n        await mr.pageUtil.sleep(500); //animation\r\n\r\n        this.c.screenCap();\r\n\r\n        if (item.number) {\r\n            this.c.log.debug(\'Setting item number\');\r\n            await mr.pageUtil.setInputValue(this.c.page, itemNumberInput, item.number);\r\n        }\r\n\r\n        if (item.description) {\r\n            this.c.log.debug(\'Get description input\');\r\n            const description = await mr.pageUtil.waitForSelector(this.c.page, \'j-input[label="Description" i] input:not(:read-only)\', 1000);\r\n\r\n            this.c.log.debug(\'Setting description\');\r\n            await mr.pageUtil.setInputValue(this.c.page, description, item.description);\r\n        }\r\n\r\n        await this.c.screenCap();\r\n\r\n    }\r\n\r\n}\r\n',
        scriptValid: true,
        codeIssues: [],
        compiled:
      'export default class ItemsWidget {\n  constructor(c) {\n    this.c = c;\n  }\n  static create(c) {\n    const url = new mr.pageUtil.Url(c.page.url());\n    if (url.path !== \'/ui/items\') {\n      throw new Error(\'Page should be on /ui/items\');\n    }\n    return Promise.resolve(new ItemsWidget(c));\n  }\n  async newItem(item) {\n    this.c.log.info(\'Opening new item dialog\');\n    this.c.log.debug(\'Getting new item button\');\n    const button = await mr.pageUtil.waitForElementByText(this.c.page, \'button\', \'Item\', 10000); //long because the page could still be loading\n\n    // I think we need to wait for the items grid to finish loading or once it does, it just resets the previous button click. This is easier\n    await mr.pageUtil.sleep(1000);\n    this.c.screenCap();\n    this.c.log.debug(\'Clicking new item button\');\n    await button.click();\n    this.c.log.debug(\'Waiting for input\');\n    // For some reason there\'s two of these inputs rendered. One with and one without readonly\n    const itemNumberInput = await mr.pageUtil.waitForSelector(this.c.page, \'j-input[label="Item Number" i] input:not(:read-only)\', 5000);\n    await mr.pageUtil.sleep(500); //animation\n\n    this.c.screenCap();\n    if (item.number) {\n      this.c.log.debug(\'Setting item number\');\n      await mr.pageUtil.setInputValue(this.c.page, itemNumberInput, item.number);\n    }\n    if (item.description) {\n      this.c.log.debug(\'Get description input\');\n      const description = await mr.pageUtil.waitForSelector(this.c.page, \'j-input[label="Description" i] input:not(:read-only)\', 1000);\n      this.c.log.debug(\'Setting description\');\n      await mr.pageUtil.setInputValue(this.c.page, description, item.description);\n    }\n    await this.c.screenCap();\n  }\n}',
        methods: [
            {
                name: 'newItem',
                returnType: 'Promise<void>',
                inputs: [
                    {
                        name: 'unknown',
                        type: 'Partial',
                    },
                ],
            },
        ],
    };

    const cleaner = new Cleaner(fieldConfig.fields as any);

    const cleaned = cleaner.clean(value);

    console.log(JSON.stringify(cleaned, null, 2));
}