
import * as ts from 'typescript';
import { TypedEntityNode } from './transformer/TypedEntityNode';

export function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {

   return (context: ts.TransformationContext) => {

      const visit: ts.Visitor = (node): ts.Node => {

         if (ts.isNewExpression(node) && node.expression.getText() === 'TypedEntity') {

            //If the user gave an explicit config, don't overwrite them
            if (node.arguments?.length) {
               return node;
            }

            const typedEntityNode = TypedEntityNode.create(node, program.getTypeChecker());

            console.log(typedEntityNode.getString());

            if (typedEntityNode) { return typedEntityNode.getNode(); }

         }

         return ts.visitEachChild(node, (child) => visit(child), context);

      };

      return (file: ts.SourceFile) => ts.visitNode(file, visit);
   };

}

/*
function createExpression(fields: Field[]): ts.ArrayLiteralExpression {

   const elements = fields.map(f => {

      const typesElements = f.types.map(t => {

         if (typeof t === 'string') {
            return ts.factory.createStringLiteral(t);
         } else if (isValueList(t)) {
            return ts.factory.createObjectLiteralExpression([
               ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral('enum')),
               ts.factory.createPropertyAssignment('values', ts.factory.createArrayLiteralExpression(t.values.map(v => {
                  if (typeof v === 'string') { return ts.factory.createStringLiteral(v); }
                  return ts.factory.createNumericLiteral(v);
               })))
            ])
         } else {
            return createExpression(t as Field[]);
         }

      });

      const name = ts.factory.createPropertyAssignment('name', ts.factory.createStringLiteral(f.name));
      const allowUndefined = ts.factory.createPropertyAssignment('allowUndefined', f.allowUndefined ? ts.factory.createTrue() : ts.factory.createFalse());
      const allowNull = ts.factory.createPropertyAssignment('allowNull', f.allowNull ? ts.factory.createTrue() : ts.factory.createFalse());
      const types = ts.factory.createPropertyAssignment('types', ts.factory.createArrayLiteralExpression(typesElements));


      return ts.factory.createObjectLiteralExpression([
         name,
         allowNull,
         allowUndefined,
         types
      ]);

   });

   const array = ts.factory.createArrayLiteralExpression(elements);
   return array;

}
*/