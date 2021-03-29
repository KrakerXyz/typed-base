import { EntityConfig, FieldConfig } from '../orm/EntityConfig';
import * as ts from 'typescript';
import { createField } from './fieldFactory';

export class TypedEntityNode {

   private constructor(private readonly _config: EntityConfig) { }

   public static create(node: ts.NewExpression, typeChecker: ts.TypeChecker): TypedEntityNode {
      if (node.typeArguments?.length !== 1) { throw new Error('Expected exactly one generic arguments for TypedEntity'); }

      const typeNode = node.typeArguments[0];

      const type = typeChecker.getTypeFromTypeNode(typeNode);
      const symbols = typeChecker.getPropertiesOfType(type);
      const fields = symbols.map(s => createField(s, typeChecker));

      const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as FieldConfig);

      return new TypedEntityNode({ fields: fieldConfig });

   }

   // function createField(symbol: ts.Symbol, typeChecker: ts.TypeChecker): Field {
   // return {
   //    name: symbol.getName(),
   //    allowUndefined: symbol.declarations.some(d => (d as ts.PropertySignature).questionToken),
   //    allowNull: isNullable(symbol),
   //    types: getTypes(symbol, typeChecker)
   // }
}

//    /** Returns a new node to be used in place of the original NewExpression node that includes a config object constructor parameter */
//    public getConfiguredNode(): ts.NewExpression {
//    return null as any as ts.NewExpression;
// }
