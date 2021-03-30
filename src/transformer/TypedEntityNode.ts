import { EntityConfig, FieldConfig, FieldValue, ValueType } from '../orm/EntityConfig';
import * as ts from 'typescript';
import { createFieldConfig } from './fieldFactory';

export class TypedEntityNode {

   private constructor(private readonly _config: EntityConfig) { }

   public static create(node: ts.NewExpression, typeChecker: ts.TypeChecker): TypedEntityNode {
      if (node.typeArguments?.length !== 1) { throw new Error('Expected exactly one generic arguments for TypedEntity'); }

      const typeNode = node.typeArguments[0];

      const type = typeChecker.getTypeFromTypeNode(typeNode);
      const symbols = typeChecker.getPropertiesOfType(type);
      const fields = symbols.map(s => createFieldConfig(s, typeChecker));

      const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as FieldConfig);

      return new TypedEntityNode({ fields: fieldConfig });

   }

   /** Returns a new node to be used in place of the original NewExpression node that includes a config object constructor parameter */
   public getNode(): ts.NewExpression {
      return null as any as ts.NewExpression;
   }



   public getString(): string {

      const tokens: string[] = [];
      tokens.push('{fields:');
      this.writeFieldConfigString(this._config.fields, tokens);
      tokens.push('}');
      return tokens.join('');

   }

   private writeFieldConfigString(field: FieldConfig, tokens: string[]) {

      tokens.push('{');
      let isFirst = true;
      for (const key of Object.keys(field)) {

         if (!isFirst) { tokens.push(','); }
         isFirst = false;

         const f = field[key];
         tokens.push(`${key}:{allowUndefined:${f.allowUndefined},values:[`);

         let isFirst2 = true;
         for (const v of f.values) {
            if (!isFirst2) {
               tokens.push(',');
            }
            this.writeFieldValueString(v, tokens);
            isFirst2 = false;
         }
         tokens.push(']}');

      }
      tokens.push('}');
   }

   private writeFieldValueString(value: FieldValue, tokens: string[]) {
      tokens.push(`{type:${value.type}`);
      switch (value.type) {
         case ValueType.Null: break;
         case ValueType.Literal: {
            if (typeof value.value === 'string') { tokens.push(`, value:'${value.value}'`); }
            else { tokens.push(`, value:${value.value}`); }
            break;
         }
         case ValueType.Value: tokens.push(`, value:'${value.value}'`); break;
         case ValueType.Array: {
            tokens.push(`, value:`);
            this.writeFieldValueString(value.value, tokens);
            break;
         }
         case ValueType.Object: {
            tokens.push(', value:');
            this.writeFieldConfigString(value.value, tokens);
            break;
         }
      }

      tokens.push('}');
   }
}