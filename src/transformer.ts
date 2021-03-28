
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

            console.log(JSON.stringify(schemaProperties, null, 3));

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
      allowNull: isNullable(symbol),
      type: getTypes(symbol, typeChecker)
   }
}

function isNullable(symbol: ts.Symbol): boolean {
   const declarations = symbol.declarations;
   const propertySignatures: ts.PropertySignature[] = declarations.filter(d => ts.isPropertySignature(d)) as ts.PropertySignature[];
   const unionNodes: ts.UnionTypeNode[] = propertySignatures.filter(p => p.type && ts.isUnionTypeNode(p.type)).map(p => p.type!) as ts.UnionTypeNode[];
   if (unionNodes.some(u => u.types.some(t => ts.isLiteralTypeNode(t) && t.getChildren()[0].kind === ts.SyntaxKind.NullKeyword))) { return true; }
   return false;
}

function getTypes(symbol: ts.Symbol, typeChecker: ts.TypeChecker) {

   const fullName = `${(symbol as any).parent?.name}.${symbol.name}`;

   if (!symbol.declarations.length) { throw new Error(`Could not get type for ${fullName} because it had no declaration`); }

   if (symbol.declarations.length > 1) { throw new Error(`More than one declaration on ${fullName} was unexpected`); }

   const declaration = symbol.declarations[0];

   if (!ts.isPropertySignature(declaration)) { throw new Error(`Declaration for ${fullName} was not a PropertyDeclaration`); }

   if (!declaration.type) {
      throw new Error(`Declaration for ${fullName} did not have a type`);
   }

   let types = [declaration.type];


   if (ts.isUnionTypeNode(types[0])) {
      types = [...(types[0] as ts.UnionTypeNode).types];
   }

   const returnTypes: (string | Record<string, any>[])[] = [];

   for (const t of types) {
      const retType = getType(fullName, t, typeChecker);
      if (!retType) { continue; }
      returnTypes.push(retType);
   }

   return returnTypes;

}

function getType(fullName: string, t: ts.TypeNode, typeChecker: ts.TypeChecker) {
   if (ts.isLiteralTypeNode(t) && t.getChildren()[0].kind === ts.SyntaxKind.NullKeyword) { return undefined; }

   switch (t.kind) {
      case ts.SyntaxKind.NumberKeyword: return 'number';
      case ts.SyntaxKind.StringKeyword: return 'string';
      case ts.SyntaxKind.BooleanKeyword: return 'boolean';
      case ts.SyntaxKind.TypeReference: {
         const refType = t as ts.TypeReferenceNode;
         const type = typeChecker.getTypeFromTypeNode(refType);
         const typeProps = typeChecker.getPropertiesOfType(type);
         const fields = typeProps.map(p => createField(p, typeChecker));
         return fields;
      }
      default: throw new Error(`Property type ${ts.SyntaxKind[t.kind]} for ${fullName} not supported`);
   }
}

