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
      this.writeFieldConfig(this._config.fields, tokens);
      tokens.push('}');
      return tokens.join('');

   }

   private writeFieldConfig(field: FieldConfig, tokens: string[]) {

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
            this.writeFieldValue(v, tokens);
            isFirst2 = false;
         }
         tokens.push(']}');

      }
      tokens.push('}');
   }

   private writeFieldValue(value: FieldValue, tokens: string[]) {
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
            this.writeFieldValue(value.value, tokens);
            break;
         }
         case ValueType.Object: {
            tokens.push(', value:');
            this.writeFieldConfig(value.value, tokens);
            break;
         }
      }

      tokens.push('}');
      // tokens.push(`name:'${f.name}',`);
      // tokens.push(`allowUndefined:${f.allowUndefined},`);
      // tokens.push(`allowNull:${f.allowNull},`);
      // tokens.push('types:[');
      // for (let it = 0; it < f.types.length; it++) {
      //    const type = f.types[it];
      //    if (it) { tokens.push(','); }
      //    if (typeof type === 'string') {
      //       tokens.push(`'${type}'`);
      //    } else if (isValueList(type)) {
      //       tokens.push(`{type:'enum',values:[`);
      //       const valueList = type.values.map(v => typeof v === 'string' ? `'${v}'` : v.toString());
      //       tokens.push(valueList.join(','));
      //       tokens.push(']}');
      //    } else {
      //       const inner = writeFieldsAsString(type);
      //       tokens.push(inner);
      //    }
      // }
   }
}