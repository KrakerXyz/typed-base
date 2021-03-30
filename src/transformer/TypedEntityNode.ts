import { EntityConfig, FieldConfig, FieldValue, ValueType } from '../orm/EntityConfig';
import * as ts from 'typescript';
import { createFieldConfig } from './fieldFactory';

export class TypedEntityNode {

   private constructor(private readonly _config: EntityConfig, private readonly _expression: ts.LeftHandSideExpression, private readonly _typeNode: ts.TypeNode) { }

   public static create(node: ts.NewExpression, typeChecker: ts.TypeChecker): TypedEntityNode {
      if (node.typeArguments?.length !== 1) { throw new Error('Expected exactly one generic arguments for TypedEntity'); }

      const typeNode = node.typeArguments[0];

      const type = typeChecker.getTypeFromTypeNode(typeNode);
      const symbols = typeChecker.getPropertiesOfType(type);
      const fields = symbols.map(s => createFieldConfig(s, typeChecker));

      const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as FieldConfig);

      return new TypedEntityNode({ fields: fieldConfig }, node.expression, typeNode);

   }

   /** Returns a new node to be used in place of the original NewExpression node that includes a config object constructor parameter */
   public getNode(): ts.NewExpression {

      const fieldsObject = this.getFieldConfigExpression(this._config.fields);

      const configProperties: ts.ObjectLiteralElementLike[] = [
         ts.factory.createPropertyAssignment('fields', fieldsObject)
      ];

      const configExpression = ts.factory.createObjectLiteralExpression(configProperties);

      return ts.factory.createNewExpression(this._expression, [this._typeNode], [configExpression]);
   }

   private getFieldConfigExpression(fieldConfig: FieldConfig): ts.ObjectLiteralExpression {

      const properties: ts.ObjectLiteralElementLike[] = [];

      for (const key of Object.getOwnPropertyNames(fieldConfig)) {

         const fieldValue = fieldConfig[key];

         const fieldObject = ts.factory.createObjectLiteralExpression([
            ts.factory.createPropertyAssignment('allowUndefined', fieldValue.allowUndefined ? ts.factory.createTrue() : ts.factory.createFalse()),
            ts.factory.createPropertyAssignment('values', this.getFieldValuesExpression(fieldValue.values))
         ]);

         properties.push(ts.factory.createPropertyAssignment(key, fieldObject));

      }

      return ts.factory.createObjectLiteralExpression(properties);
   }

   private getFieldValuesExpression(fieldValue: FieldValue[]): ts.ArrayLiteralExpression {

      const elements: ts.Expression[] = [];

      const arrayExpression = ts.factory.createArrayLiteralExpression(elements);
      return arrayExpression;
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
            tokens.push(`, value:[`);
            for (let i = 0; i < value.value.length; i++) {
               if (!i) { tokens.push(','); }
               this.writeFieldValueString(value.value[i], tokens);
            }
            tokens.push(']');
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