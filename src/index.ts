
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { transformer } from './transformer';

console.log();
console.log();

const compilerOptions: ts.CompilerOptions = {
   module: ts.ModuleKind.CommonJS,
   moduleResolution: ts.ModuleResolutionKind.NodeJs,
   target: ts.ScriptTarget.ES2020,
   outDir: path.join(__dirname, '..\\dist-test'),
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

const rootFiles = [...walkDirectorySync(path.join(__dirname, '..\\test'))].filter(f => f.endsWith('.ts'));

const program = ts.createProgram(rootFiles, compilerOptions, compilerHost)
const emitResult = program.emit(undefined, undefined, undefined, undefined, {
   before: [
      transformer(program)
   ]
});

if (emitResult.emitSkipped) {
   console.warn('Emit skipped');
}


console.log();
console.log();
console.log();