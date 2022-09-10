
import * as ts from 'typescript';
import { createEntity } from './entity';
import { getTypedBaseEntitySchemaExpression } from './entityNode';

export default function transformer(program: ts.Program, config: Partial<TransformerConfig>): ts.TransformerFactory<ts.SourceFile> {
    return (context: ts.TransformationContext) => {

        return (file: ts.SourceFile) => {

            const visit: ts.Visitor = (node): ts.Node => {

                if (ts.isNewExpression(node) && node.expression.getText() === 'TypedEntity') {

                    //If the user gave an explicit config, don't overwrite them
                    if (node.arguments?.length) {
                        return node;
                    }

                    console.log(`Found TypedEntity() in ${file.fileName}`);
                    if (node.typeArguments?.length !== 1) { throw new Error('Expecting one and only one type argument for TypedEntity()'); }
                    //const typedEntityNode = TypedEntityNode.create(node, program.getTypeChecker(), config);
                    //const newNode = typedEntityNode.getNode();
                    //return newNode;
                    const typeNode = node.typeArguments[0];
                    const typeChecker = program.getTypeChecker();
                    const entity = createEntity(typeChecker, typeNode);
                    const entityName = typeChecker.getTypeFromTypeNode(typeNode).symbol.name;
                    const schemaExpression = getTypedBaseEntitySchemaExpression(entityName, entity, config);

                    const replacement = ts.factory.createNewExpression(node.expression, [typeNode], [schemaExpression]);
                    return replacement;

                }

                return ts.visitEachChild(node, (child) => visit(child), context);

            };

            return ts.visitNode(file, visit);
        };

    };

}

export interface TransformerConfig {
    collectionNamingStrategy: 'kebab' | 'pascal' | 'camel' | 'snake';
}