
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
            if (typedEntityNode) { return typedEntityNode.getConfiguredNode(); }

            // console.log(`Found TypedEntity for ${typeNode.getText()}`);

            // const typeChecker = program.getTypeChecker();


            // const str = writeFieldsAsString(fields);

            // console.log(str);

            // const newNode = context.factory.createNewExpression(
            //    node.expression,
            //    node.typeArguments,
            //    [createExpression(fields)]
            // );

            // return newNode;

         }

         return ts.visitEachChild(node, (child) => visit(child), context);

      };

      return (file: ts.SourceFile) => ts.visitNode(file, visit);
   };

}

function createField(symbol: ts.Symbol, typeChecker: ts.TypeChecker): Field {
   return {
      name: symbol.getName(),
      allowUndefined: symbol.declarations.some(d => (d as ts.PropertySignature).questionToken),
      allowNull: isNullable(symbol),
      types: getTypes(symbol, typeChecker)
   }
}

function isNullable(symbol: ts.Symbol): boolean {
   const declarations = symbol.declarations;
   const propertySignatures: ts.PropertySignature[] = declarations.filter(d => ts.isPropertySignature(d)) as ts.PropertySignature[];
   const unionNodes: ts.UnionTypeNode[] = propertySignatures.filter(p => p.type && ts.isUnionTypeNode(p.type)).map(p => p.type!) as ts.UnionTypeNode[];
   if (unionNodes.some(u => u.types.some(t => ts.isLiteralTypeNode(t) && t.getChildren()[0].kind === ts.SyntaxKind.NullKeyword))) { return true; }
   return false;
}

function getTypes(symbol: ts.Symbol, typeChecker: ts.TypeChecker): FieldType[] {

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

   const returnTypes: FieldType[] = [];

   for (const t of types) {
      const retType = getType(fullName, t, typeChecker);
      if (!retType) { continue; }
      returnTypes.push(retType);
   }

   return returnTypes;

}

function getType(fullName: string, t: ts.TypeNode, typeChecker: ts.TypeChecker): FieldType | undefined {
   if (ts.isLiteralTypeNode(t) && t.getChildren()[0].kind === ts.SyntaxKind.NullKeyword) { return undefined; }

   switch (t.kind) {
      case ts.SyntaxKind.NumberKeyword: return 'number';
      case ts.SyntaxKind.StringKeyword: return 'string';
      case ts.SyntaxKind.BooleanKeyword: return 'boolean';
      case ts.SyntaxKind.TypeReference: {
         const refType = t as ts.TypeReferenceNode;
         const type = typeChecker.getTypeFromTypeNode(refType);

         const enumDecl = type.aliasSymbol?.declarations[0];
         if (enumDecl && ts.isEnumDeclaration(enumDecl)) {
            const members = enumDecl.members;
            const values: ValueList['values'] = members.map((m, i) => {
               if (!m.initializer) { return i; }
               if (ts.isStringLiteral(m.initializer)) {
                  return m.initializer.text;
               }
               throw new Error(`Unknown initializer type for enum of ${fullName}`);
            });
            return {
               values
            };
         }

         const typeProps = typeChecker.getPropertiesOfType(type);
         const fields = typeProps.map(p => createField(p, typeChecker));
         return fields;
      }
      default: throw new Error(`Property type ${ts.SyntaxKind[t.kind]} for ${fullName} not supported`);
   }
}

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

function writeFieldsAsString(fields: Field[]): string {

   const tokens: string[] = [];

   tokens.push('[');

   for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (i) { tokens.push(','); }
      tokens.push('{');
      tokens.push(`name:'${f.name}',`);
      tokens.push(`allowUndefined:${f.allowUndefined},`);
      tokens.push(`allowNull:${f.allowNull},`);
      tokens.push('types:[');
      for (let it = 0; it < f.types.length; it++) {
         const type = f.types[it];
         if (it) { tokens.push(','); }
         if (typeof type === 'string') {
            tokens.push(`'${type}'`);
         } else if (isValueList(type)) {
            tokens.push(`{type:'enum',values:[`);
            const valueList = type.values.map(v => typeof v === 'string' ? `'${v}'` : v.toString());
            tokens.push(valueList.join(','));
            tokens.push(']}');
         } else {
            const inner = writeFieldsAsString(type);
            tokens.push(inner);
         }
      }
      tokens.push(']');
      tokens.push('}');
   }

   tokens.push(']');

   return tokens.join('');

}

type FieldType = 'number' | 'string' | 'boolean' | ValueList | Field[];

interface Field {
   name: string;
   allowUndefined: boolean;
   allowNull: boolean;
   types: FieldType[];
}

interface ValueList {
   values: (number | string)[]
}

function isValueList(t: FieldType): t is ValueList {
   return !!(t as ValueList).values
}

