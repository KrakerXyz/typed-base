
import * as ts from 'typescript';
import { FieldConfig, FieldValue, LiteralValue, ValueType } from '../orm';

export function createFieldConfig(symbol: ts.Symbol, typeChecker: ts.TypeChecker): FieldConfig {

    const fullName = getFullName(symbol);

    try {

        if (!symbol.declarations?.length) { throw new Error(`Symbol does not have any declarations (${fullName})`); }
        if (symbol.declarations.length > 1) { throw new Error(`More than one declaration for symbol was unexpected (${fullName})`); }

        const declaration = symbol.declarations[0];
        if (!ts.isPropertySignature(declaration)) { throw new Error(`Declaration for symbol was not a PropertyDeclaration (${fullName})`); }

        const config: FieldConfig = {};
        config[symbol.name] = {
            allowUndefined: !!declaration.questionToken,
            values: getType(fullName, declaration.type!, typeChecker)
        };

        return config;
        
    } catch (e: any) {
        throw new Error(`Error creating field config for '${fullName}': ${e.message}`);
    }

}

function getFullName(sym: ts.Symbol): string {
    const parent = (sym as any).parent;
    const parentName = parent?.name ? `${getFullName(parent)}.` : '';
    return `${parentName}${sym.name}`;
}

function getType(fullName: string, t: ts.TypeNode, typeChecker: ts.TypeChecker): FieldValue[] {

    switch (t.kind) {
        case ts.SyntaxKind.NumberKeyword: return [{
            type: ValueType.Value,
            value: 'number'
        }];
        case ts.SyntaxKind.TemplateLiteralType:
        case ts.SyntaxKind.StringKeyword: return [{
            type: ValueType.Value,
            value: 'string'
        }];
        case ts.SyntaxKind.BooleanKeyword: return [{
            type: ValueType.Value,
            value: 'boolean'
        }];
        case ts.SyntaxKind.LiteralType: {
            const children = t.getChildren();
            if (!children.length || children.length > 1) { throw new Error(`Unexpected number of children for Literal (${fullName})`); }

            const child = children[0];
            switch (child.kind) {
                case ts.SyntaxKind.NullKeyword: {
                    return [{
                        type: ValueType.Null
                    }];
                }
                case ts.SyntaxKind.StringLiteral: {

                    return [{
                        type: ValueType.Literal,
                        value: (child as ts.StringLiteral).text
                    }];

                }
                case ts.SyntaxKind.NumericLiteral: {
                    return [{
                        type: ValueType.Literal,
                        value: parseFloat((child as ts.NumericLiteral).text)
                    }];
                }
                case ts.SyntaxKind.FalseKeyword: {
                    return [{
                        type: ValueType.Literal,
                        value: false
                    }];
                }
                case ts.SyntaxKind.TrueKeyword: {
                    return [{
                        type: ValueType.Literal,
                        value: true
                    }];
                }
                default: {
                    throw new Error(`Unknown Literal child kind ${ts.SyntaxKind[child.kind]} (${fullName})`);
                }
            }
        }
        case ts.SyntaxKind.TypeReference:
        case ts.SyntaxKind.TypeLiteral: {

            const refType = t as ts.TypeReferenceNode;
            const type = typeChecker.getTypeFromTypeNode(refType);

            //I was using Omit<Enum, Enum.Item> and could not find an easy way to see whats left
            if (type.aliasSymbol?.escapedName === 'Omit') { throw new Error('Omit is not supported'); }

            const enumDecl = (type.aliasSymbol?.declarations ?? [])[0];
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

            if (refType.typeName?.getText() === 'Record') {
                return [{ type: ValueType.Any }];
            }

            const texts: string[] | undefined = (type as any).texts;
            if (texts?.length && texts[0] == '' && texts.slice(-1)[0] === '') {
            //When we have something like 
            //
            //type Id = `${string}-${string}`
            //interface Foo {
            //   id: Id
            //}
            //We end up getting this TypeLiteral but I can find no way to see that it is a string literal other than hoping this texts test is sufficient.
            //From what I've seen, no matter the interpolations, the texts always has '' as the first and last elements. For the above example, it would be
            //['', '-', '']
                return [{
                    type: ValueType.Value,
                    value: 'string'
                }];

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
            const elementType = (t as ts.ArrayTypeNode).elementType;
            const elementFieldValues = getType(fullName, elementType, typeChecker);
            return [{
                type: ValueType.Array,
                value: elementFieldValues
            }];
        }
        case ts.SyntaxKind.ParenthesizedType: {
            const innerType = (t as ts.ParenthesizedTypeNode).type;
            const typeFieldValues = getType(fullName, innerType, typeChecker);
            return typeFieldValues;
        }
        case ts.SyntaxKind.UnionType: {
            const unionTypeFields = (t as ts.UnionTypeNode).types.map(t => getType(fullName, t, typeChecker));
            return unionTypeFields.flatMap(t => t);
        }
        default: throw new Error(`Property type ${ts.SyntaxKind[t.kind]} for ${fullName} not supported`);
    }
}
