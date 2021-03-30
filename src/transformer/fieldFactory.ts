
import * as ts from 'typescript';
import { FieldConfig, FieldValue, LiteralValue, ValueType } from '../orm';

export function createFieldConfig(symbol: ts.Symbol, typeChecker: ts.TypeChecker): FieldConfig {

   const fullName = `${(symbol as any).parent?.name}.${symbol.name}`;

   if (!symbol.declarations.length) { throw new Error(`Symbol does not have any declarations (${fullName})`); }
   if (symbol.declarations.length > 1) { throw new Error(`More than one declaration for symbol was unexpected (${fullName})`); }

   const declaration = symbol.declarations[0];
   if (!ts.isPropertySignature(declaration)) { throw new Error(`Declaration for symbol was not a PropertyDeclaration (${fullName})`); }



   const config: FieldConfig = {};
   config[symbol.name] = {
      allowUndefined: !!declaration.questionToken,
      values: createFieldValues(declaration, fullName, typeChecker)
   }

   return config;

}

function createFieldValues(propertySignature: ts.PropertySignature, fullName: string, typeChecker: ts.TypeChecker): FieldValue[] {

   if (!propertySignature.type) {
      throw new Error(`PropertySignature did not have a type (${fullName})`);
   }

   let types = [propertySignature.type];


   if (ts.isUnionTypeNode(types[0])) {
      types = [...(types[0] as ts.UnionTypeNode).types];
   }

   return types.map(t => getType(fullName, t, typeChecker)).flatMap(a => a);

}

function getType(fullName: string, t: ts.TypeNode, typeChecker: ts.TypeChecker): FieldValue[] {

   switch (t.kind) {
      case ts.SyntaxKind.NumberKeyword: return [{
         type: ValueType.Value,
         value: 'number'
      }];
      case ts.SyntaxKind.StringKeyword: return [{
         type: ValueType.Value,
         value: 'string'
      }]
      case ts.SyntaxKind.BooleanKeyword: return [{
         type: ValueType.Value,
         value: 'boolean'
      }]
      case ts.SyntaxKind.LiteralType: {
         const children = t.getChildren();
         if (!children.length || children.length > 1) { throw new Error(`Unexpected number of children for Literal (${fullName})`); }
         if (children[0].kind !== ts.SyntaxKind.NullKeyword) { throw new Error(`Unknown Literal child kind (${fullName})`); }
         return [{
            type: ValueType.Null
         }];
      }
      case ts.SyntaxKind.TypeReference: {

         const refType = t as ts.TypeReferenceNode;
         const type = typeChecker.getTypeFromTypeNode(refType);

         const enumDecl = type.aliasSymbol?.declarations[0];
         if (enumDecl && ts.isEnumDeclaration(enumDecl)) {
            const members = enumDecl.members;
            const values: LiteralValue[] = members.map((m, i) => {

               if (!m.initializer) {
                  return {
                     type: ValueType.Literal,
                     value: i
                  };
               }

               if (ts.isStringLiteral(m.initializer)) {
                  return {
                     type: ValueType.Literal,
                     value: m.initializer?.text ?? i
                  };
               }

               throw new Error(`Unknown initializer type for enum of ${fullName}`);
            });
            return values;
         }

         const typeProperties = typeChecker.getPropertiesOfType(type);
         const fields = typeProperties.map(s => createFieldConfig(s, typeChecker));
         const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as FieldConfig);

         return [{
            type: ValueType.Object,
            value: fieldConfig
         }];

      }
      case ts.SyntaxKind.ArrayType: {

      }
      default: throw new Error(`Property type ${ts.SyntaxKind[t.kind]} for ${fullName} not supported`);
   }
}
