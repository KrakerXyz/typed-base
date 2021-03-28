
import * as ts from 'typescript';

export function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {

   return (context: ts.TransformationContext) => {

      const visit: ts.Visitor = (node) => {

         if (ts.isNewExpression(node) && node.expression.getText() === 'TypedSchema') {
            if (node.typeArguments?.length !== 1) { throw new Error('Expected exactly one generic arguments for TypedSchema'); }

            const typeNode = node.typeArguments[0];
            console.log(`Found TypedSchema for ${typeNode.getText()}`);

            const typeChecker = program.getTypeChecker();
            const type = typeChecker.getTypeFromTypeNode(typeNode);
            const symbols = typeChecker.getPropertiesOfType(type);
            const schemaProperties = symbols.map(s => createField(s, typeChecker));

            console.log(schemaProperties);

         }

         return ts.visitEachChild(node, (child) => visit(child), context);

      };

      return (file: ts.SourceFile) => ts.visitNode(file, visit);
   };

}

function createField(symbol: ts.Symbol, typeChecker: ts.TypeChecker) {
   return {
      name: symbol.getName(),
      allowUndefined: symbol.declarations.some(d => (d as ts.PropertySignature).questionToken),
      type: getType(symbol, typeChecker)
   }
}

function getType(symbol: ts.Symbol, typeChecker: ts.TypeChecker) {

   const fullName = `${(symbol as any).parent?.name}.${symbol.name}`;

   if (!symbol.declarations.length) { throw new Error(`Could not get type for ${fullName} because it had no declaration`); }

   if (symbol.declarations.length > 1) { throw new Error(`More than one declaration on ${fullName} was unexpected`); }

   const declaration = symbol.declarations[0];

   if (!ts.isPropertySignature(declaration)) { throw new Error(`Declaration for ${fullName} was not a PropertyDeclaration`); }

   const type = declaration.type;

   if (!type) { throw new Error(`No type given for ${fullName}`); }

   switch (type.kind) {
      case ts.SyntaxKind.NumberKeyword: return Number;
      case ts.SyntaxKind.StringKeyword: return String;
      default: throw new Error(`Property type ${ts.SyntaxKind[type.kind]} for ${fullName} not supported`);
   }

}
