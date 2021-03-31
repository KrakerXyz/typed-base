import { EntityConfig, FieldConfig, FieldValue, ValueType } from '../orm/EntityConfig';
import * as ts from 'typescript';
import { createFieldConfig } from './fieldFactory';

export class TypedEntityNode {

   private constructor(
      private readonly _config: EntityConfig,
      private readonly _expression: ts.LeftHandSideExpression,
      private readonly _typeNode: ts.TypeNode) { }

   public static create(node: ts.NewExpression, typeChecker: ts.TypeChecker): TypedEntityNode {
      if (node.typeArguments?.length !== 1) { throw new Error('Expected exactly one generic arguments for TypedEntity'); }

      const typeNode = node.typeArguments[0];

      const type = typeChecker.getTypeFromTypeNode(typeNode);
      const symbols = typeChecker.getPropertiesOfType(type);
      const fields = symbols.map(s => createFieldConfig(s, typeChecker));

      const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as FieldConfig);

      return new TypedEntityNode({ name: type.symbol.name, fields: fieldConfig }, node.expression, typeNode);

   }

   /** Returns a new node to be used in place of the original NewExpression node that includes a config object constructor parameter */
   public getNode(): ts.NewExpression {

      const fieldsObject = this.getFieldConfigExpression(this._config.fields);

      const configProperties: ts.ObjectLiteralElementLike[] = [
         ts.factory.createPropertyAssignment('name', ts.factory.createStringLiteral(this._config.name)),
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

      for (const v of fieldValue) {
         switch (v.type) {
            case ValueType.Null: {
               elements.push(ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(0))
               ]));
               break;
            }
            case ValueType.Value: {
               elements.push(ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(1)),
                  ts.factory.createPropertyAssignment('value', ts.factory.createStringLiteral(v.value))
               ]));
               break;
            }
            case ValueType.Literal: {

               const initializer = typeof v.value === 'string' ? ts.factory.createStringLiteral(v.value)
                  : typeof v.value === 'number' ? ts.factory.createNumericLiteral(v.value)
                     : v.value ? ts.factory.createTrue()
                        : ts.factory.createFalse();

               elements.push(ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(2)),
                  ts.factory.createPropertyAssignment('value', initializer)
               ]));
               break;
            }
            case ValueType.Object: {
               elements.push(ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(3)),
                  ts.factory.createPropertyAssignment('value', this.getFieldConfigExpression(v.value))
               ]));
               break;
            }
            case ValueType.Array: {
               elements.push(ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(4)),
                  ts.factory.createPropertyAssignment('value', this.getFieldValuesExpression(v.value))
               ]));
               break;
            }
            default: {
               const _: never = v;
            }
         }
      }

      const arrayExpression = ts.factory.createArrayLiteralExpression(elements);
      return arrayExpression;
   }
}