/* eslint-disable max-depth */


import * as ts from 'typescript';
import { ValueType } from '../orm';

export function createProperty(typeChecker: ts.TypeChecker, symbol: ts.Symbol): Property {

    const fullName = `${(symbol as any).parent?.name}.${symbol.name}`;

    if (!symbol.declarations?.length) { throw new Error(`Symbol does not have any declarations (${fullName})`); }
    if (symbol.declarations.length > 1) {
        throw new Error(`More than one declaration for symbol was unexpected (${fullName})`);
    }

    const declaration = symbol.declarations[0];
    if (!ts.isPropertySignature(declaration)) {
        throw new Error(`Declaration for symbol was not a PropertyDeclaration (${fullName}). It was ${ts.SyntaxKind[declaration.kind]}`);
    }

    const isPartial = (symbol as any).mappedType?.aliasSymbol?.escapedName === 'Partial';

    return {
        isOptional: !!declaration.questionToken || isPartial,
        values: getType(fullName, declaration.type!, typeChecker)
    };

}

// eslint-disable-next-line complexity
function getType(fullName: string, t: ts.TypeNode, typeChecker: ts.TypeChecker): PropertyValue[] {

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

            if (type.isUnion()) {
                const properties: PropertyValue[] = [];
                for (const ut of type.types) {
                    if ('intrinsicName' in ut) {
                        properties.push({
                            type: ValueType.Value,
                            value: (ut as any).intrinsicName
                        });
                    } else if ('value' in ut) {
                        properties.push({
                            type: ValueType.Literal,
                            value: (ut as any).value
                        });
                    } else {
                        console.error(`Unknown union type '${ut.getSymbol()?.name}'`, ut);
                        throw new Error(`Unknown union type '${ut.getSymbol()?.name}'`);
                    }
                }
                return properties;
            }

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

                    if (ts.isNumericLiteral(m.initializer)) {
                        return {
                            type: ValueType.Literal,
                            value: parseInt(m.initializer.text ?? i.toString())
                        };
                    }

                    throw new Error(`Unknown initializer type for enum of ${fullName}`);
                });
                return values;
            }

            //This tests for a property who's value is a specific enum value. Eg, { foo: Foo.Bar } where Foo is an enum
            const typeSymbolDecl0: ts.Declaration | undefined = (type.symbol?.declarations ?? [])[0];
            if (typeSymbolDecl0 && ts.isEnumMember(typeSymbolDecl0)) {
                return [{ type: ValueType.Literal, value: (type as any).value }];
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
            const fields = typeProperties.map(s => ({ [s.name]: createProperty(typeChecker, s) }));
            const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as Record<string, Property>);

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
        case ts.SyntaxKind.TupleType: {

            const tupleTypes: PropertyValue[][] = [];

            for (const e of (t as ts.TupleTypeNode).elements) {
                if (ts.isRestTypeNode(e)) {
                    const eType = getType(fullName, e.type, typeChecker);
                    if (eType.length !== 1) { throw new Error('Unexpected number of types created from rest parameter'); }
                    (eType[0] as ArrayValue).isRest = true;
                    tupleTypes.push(eType);
                } else {
                    tupleTypes.push(getType(fullName, e, typeChecker));
                }
            }

            return [{
                type: ValueType.Tuple,
                value: tupleTypes
            }];
        }
        default: throw new Error(`Property type ${ts.SyntaxKind[t.kind]} for ${fullName} not supported`);
    }
}

export type Properties = Record<string, Property>;

export type Property = { isOptional: boolean, values: PropertyValue[] }

export type PropertyValue = LiteralValue | ObjectValue | ValueValue | ArrayValue | NullValue | AnyValue | TupleValue;

export interface NullValue {
    type: ValueType.Null;
}

export interface AnyValue {
    type: ValueType.Any;
}

export interface ValueValue {
    type: ValueType.Value;
    value: 'number' | 'string' | 'boolean';
}

/** Represents a set of literal values that are acceptable for a field. A typical use case if for enum values where the values list would be a number for each index of the enum */
export interface LiteralValue {
    type: ValueType.Literal;
    value: number | string | boolean;
}

export interface ObjectValue {
    type: ValueType.Object;
    value: Properties;
}

export interface ArrayValue {
    type: ValueType.Array;
    /** Array of the possible value types for the array */
    value: PropertyValue[];
    /** Indicates that this array was part of a spread (...) */
    isRest?: boolean;
}

export interface TupleValue {
    type: ValueType.Tuple,
    /** The value types possible for each element of the Tuple */
    value: PropertyValue[][]
}