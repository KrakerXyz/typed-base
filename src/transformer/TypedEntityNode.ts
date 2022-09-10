import { EntityConfig, FieldConfig, FieldValue, ValueType } from '../orm/EntityConfig';
import * as ts from 'typescript';
import { createFieldConfig } from './fieldFactory';
import { TransformerConfig } from './transformer';

export class TypedEntityNode {

    private constructor(
        private readonly _config: EntityConfig,
        private readonly _expression: ts.LeftHandSideExpression,
        private readonly _typeNode: ts.TypeNode) { }

    public static create(node: ts.NewExpression, typeChecker: ts.TypeChecker, config: Partial<TransformerConfig>): TypedEntityNode {
        if (node.typeArguments?.length !== 1) { throw new Error('Expected exactly one generic arguments for TypedEntity'); }

        const typeNode = node.typeArguments[0];

        const type = typeChecker.getTypeFromTypeNode(typeNode);
        
        const symbols = typeChecker.getPropertiesOfType(type);
        const fields = symbols.map(s => createFieldConfig(s, typeChecker));

        const fieldConfig = fields.reduce((prev, cur) => ({ ...prev, ...cur }), {} as FieldConfig);

        let name = type.symbol.name;

        if (name.endsWith('y')) {
            name = name.slice(0, -1) + 'ies';
        } else if (!name.endsWith('s')) {
            name += 's';
        }

        let replacer: ((x: string) => string) | null = null;
        switch (config.collectionNamingStrategy) {
            case 'camel': {
                replacer = (() => {
                    let i = 0;
                    return (x: string) => {
                        i++;
                        if (i === 1) { return x.toLowerCase(); }
                        return x[0] + x.substring(1).toLowerCase();
                    };
                })();
                break;
            }
            case 'kebab':
                replacer = (() => {
                    let i = 0;
                    return (x: string) => {
                        i++;
                        if (i === 1) { return x.toLowerCase(); }
                        return '-' + x.toLowerCase();
                    };
                })();
                break;
            case 'pascal':
                replacer = (x) => x[0] + x.substring(1).toLowerCase();
                break;
            case 'snake':
                replacer = (() => {
                    let i = 0;
                    return (x: string) => {
                        i++;
                        if (i === 1) { return x.toLowerCase(); }
                        return '_' + x.toLowerCase();
                    };
                })();
                break;
        }

        if (replacer) {
            name = name.replace(/[A-Z]+?(?=[a-z]|[A-Z][a-z])/g, replacer);
        }

        return new TypedEntityNode({ name, fields: fieldConfig }, node.expression, typeNode);

    }

    /** Returns a new node to be used in place of the original NewExpression node that includes a config object constructor parameter */
    public getNode(): ts.NewExpression {

        try {

            const fieldsObject = this.getFieldConfigExpression(this._config.fields);

            const configProperties: ts.ObjectLiteralElementLike[] = [
                ts.factory.createPropertyAssignment('name', ts.factory.createStringLiteral(this._config.name)),
                ts.factory.createPropertyAssignment('fields', fieldsObject)
            ];

            const configExpression = ts.factory.createObjectLiteralExpression(configProperties);

            return ts.factory.createNewExpression(this._expression, [this._typeNode], [configExpression]);
        } catch (e: any) {
            throw new Error(`Error creating node for '${this._config.name}': ${e.message}`);
        }
    }

    private getFieldConfigExpression(fieldConfig: FieldConfig): ts.ObjectLiteralExpression {

        const properties: ts.ObjectLiteralElementLike[] = [];

        for (const key of Object.getOwnPropertyNames(fieldConfig)) {
            try {
                const fieldValue = fieldConfig[key];

                const fieldObject = ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('allowUndefined', fieldValue.allowUndefined ? ts.factory.createTrue() : ts.factory.createFalse()),
                    ts.factory.createPropertyAssignment('values', this.getFieldValuesExpression(fieldValue.values))
                ]);

                properties.push(ts.factory.createPropertyAssignment(key, fieldObject));
            } catch(e: any) {
                throw new Error(`Error creating expression for field '${key}': ${e.message}`);
            }
        }

        return ts.factory.createObjectLiteralExpression(properties);
    }

    private getFieldValuesExpression(fieldValue: FieldValue[]): ts.ArrayLiteralExpression {

        const elements: ts.Expression[] = [];

        for (const v of fieldValue) {
            switch (v.type) {
                case ValueType.Null: {
                    elements.push(ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(ValueType.Null))
                    ]));
                    break;
                }
                case ValueType.Value: {
                    elements.push(ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(ValueType.Value)),
                        ts.factory.createPropertyAssignment('value', ts.factory.createStringLiteral(v.value))
                    ]));
                    break;
                }
                case ValueType.Literal: {

                    const initializer = typeof v.value === 'string' ? ts.factory.createStringLiteral(v.value)
                        : typeof v.value === 'number' ? ts.factory.createNumericLiteral(v.value)
                            : v.value ? ts.factory.createTrue()
                                : ts.factory.createFalse();

                    elements.push(ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(ValueType.Literal)),
                        ts.factory.createPropertyAssignment('value', initializer)
                    ]));
                    break;
                }
                case ValueType.Object: {
                    elements.push(ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(ValueType.Object)),
                        ts.factory.createPropertyAssignment('value', this.getFieldConfigExpression(v.value))
                    ]));
                    break;
                }
                case ValueType.Array: {
                    elements.push(ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(ValueType.Array)),
                        ts.factory.createPropertyAssignment('value', this.getFieldValuesExpression(v.value))
                    ]));
                    break;
                }
                case ValueType.Any: {
                    elements.push(ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment('type', ts.factory.createNumericLiteral(ValueType.Any))
                    ]));
                    break;
                }
                default: {
                    const _: never = v;
                }
            }
        }

        const arrayExpression = ts.factory.createArrayLiteralExpression(elements);
        return arrayExpression;
    }
}