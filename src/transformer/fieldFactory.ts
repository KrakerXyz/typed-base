
import * as ts from 'typescript';
import { FieldConfig } from '../orm';

export function createField(symbol: ts.Symbol, typeChecker: ts.TypeChecker): FieldConfig {

   const config: FieldConfig = {};
   config[symbol.name] = symbol.declarations.map(d => {
      if (!ts.isPropertySignature(d)) { throw new Error('Expected PropertySignature'); }
      return {
         allowUndefined: d.questionToken ?? false,
         allowNull: d. //This might now work. We might need a Null value type since we're now looping through each value
      }
   });

   return config;

}