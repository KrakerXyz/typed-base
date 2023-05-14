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

const rootFiles = [
    ...walkDirectorySync(path.join(__dirname, '..\\..\\debug\\sut')),
].filter((f) => f.endsWith('.ts'));

const program = ts.createProgram(rootFiles, compilerOptions, compilerHost);
const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    before: [transformer(program, {})],
});

if (emitResult.emitSkipped) {
    console.warn('Emit skipped');
}

console.log();
console.log();
console.log();

function testCleaner() {
    const fieldConfig = {
        name: 'flow-domains',
        fields: {
            revId: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }],
            },
            revNumber: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'number' }],
            },
            id: {
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
            description: {
                allowUndefined: false,
                values: [{ type: 'val', value: 'string' }, { type: 'nil' }],
            },
            actions: {
                allowUndefined: false,
                values: [
                    {
                        type: 'arr',
                        value: [
                            {
                                type: 'obj',
                                value: {
                                    id: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                    type: {
                                        allowUndefined: false,
                                        values: [{ type: 'lit', value: 'create-widget' }],
                                    },
                                    widgetId: {
                                        allowUndefined: false,
                                        values: [
                                            { type: 'val', value: 'string' },
                                            { type: 'val', value: 'string' },
                                        ],
                                    },
                                    outputName: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                },
                            },
                            {
                                type: 'obj',
                                value: {
                                    id: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                    type: {
                                        allowUndefined: false,
                                        values: [{ type: 'lit', value: 'method-call' }],
                                    },
                                    methodName: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
                                    },
                                    inputNames: {
                                        allowUndefined: false,
                                        values: [
                                            {
                                                type: 'arr',
                                                value: [{ type: 'val', value: 'string' }],
                                            },
                                        ],
                                    },
                                    outputName: {
                                        allowUndefined: false,
                                        values: [{ type: 'val', value: 'string' }],
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
        'revId' : '1ac2f9b8-2cbd-4070-ac83-9862e9adc6b7',
        'revNumber' : 6,
        'id' : '1ac2f9b8-2cbd-4070-ac83-9862e9adc6b7/6',
        'created' : 1684073689126.0,
        'name' : 'Full Test',
        'description' : '',
        'actions' : [ 
            {
                'id' : '1de30c39-2c0c-4cbe-801f-b56db9b96310',
                'type' : 'create-widget',
                'widgetId' : '09c93cd1-97a2-4372-8212-95a4f1f538db/10',
                'outputName' : 'NavWidget'
            }
        ]
    };

    const cleaner = new Cleaner(fieldConfig.fields as any);

    const cleaned = cleaner.clean(value);

    console.log(JSON.stringify(cleaned, null, 2));
}
