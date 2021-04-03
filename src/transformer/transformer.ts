
import * as ts from 'typescript';
import { TypedEntityNode } from './TypedEntityNode';

export default function transformer(program: ts.Program, config: Partial<TransformerConfig>): ts.TransformerFactory<ts.SourceFile> {
   return (context: ts.TransformationContext) => {

      const visit: ts.Visitor = (node): ts.Node => {

         if (ts.isNewExpression(node) && node.expression.getText() === 'TypedEntity') {

            //If the user gave an explicit config, don't overwrite them
            if (node.arguments?.length) {
               return node;
            }

            const typedEntityNode = TypedEntityNode.create(node, program.getTypeChecker(), config);
            const newNode = typedEntityNode.getNode();
            return newNode;

         }

         return ts.visitEachChild(node, (child) => visit(child), context);

      };

      return (file: ts.SourceFile) => ts.visitNode(file, visit);
   };

}

export interface TransformerConfig {
   collectionNamingStrategy: 'kebab' | 'pascal' | 'camel' | 'snake';
}