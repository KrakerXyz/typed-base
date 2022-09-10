import * as ts from 'typescript';
import { ValueType } from '../orm';
import { Entity } from './entity';
import { Properties, PropertyValue } from './properties';
import { TransformerConfig } from './transformer';

//Entity: The schema is just a simple object
//[Entity]: The schema is an array of single type Entity
//[Entity[]]: The schema is an array with more than one element type
export function getTypedBaseEntitySchemaExpression(entityName: string, entity: Entity, config: Partial<TransformerConfig>): ts.ObjectLiteralExpression {

    try {
        
        if (entity.isArray) {
            throw new Error('Root object should not be an array');
        }

        if (entity.allowedTypes.length > 1) {
            throw new Error('Root object should be a single object');
        }

        const collectionName = getCollectionName(entityName, config);
        const fieldsExpression = getObjectExpression(entity.allowedTypes[0].properties);


        const configProperties: ts.ObjectLiteralElementLike[] = [
            ts.factory.createPropertyAssignment('name', ts.factory.createStringLiteral(collectionName)),
            ts.factory.createPropertyAssignment('fields', fieldsExpression)
        ];

        const configExpression = ts.factory.createObjectLiteralExpression(configProperties);
        return configExpression;

    } catch (e: any) {
        throw new Error(`Error creating typedBaseEntitySchemaExpression for '${entityName}': ${e.message}`);
    }
}

function getCollectionName(entityName: string, config: Partial<TransformerConfig>): string {
    let collectionName = entityName;
    if (collectionName.endsWith('y')) {
        collectionName = collectionName.slice(0, -1) + 'ies';
    } else if (!collectionName.endsWith('s')) {
        collectionName += 's';
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
        collectionName = collectionName.replace(/[A-Z]+?(?=[a-z]|[A-Z][a-z])/g, replacer);
    }

    return collectionName;
}

function getObjectExpression(properties: Properties): ts.ObjectLiteralExpression {
    const objectProperties: ts.ObjectLiteralElementLike[] = [];

    for (const key of Object.getOwnPropertyNames(properties)) {
        try {
            const fieldValue = properties[key];

            const fieldObject = ts.factory.createObjectLiteralExpression([
                ts.factory.createPropertyAssignment('allowUndefined', fieldValue.isOptional ? ts.factory.createTrue() : ts.factory.createFalse()),
                ts.factory.createPropertyAssignment('values', getFieldValuesExpression(fieldValue.values))
            ]);

            objectProperties.push(ts.factory.createPropertyAssignment(key, fieldObject));
        } catch(e: any) {
            throw new Error(`Error creating expression for field '${key}': ${e.message}`);
        }
    }

    return ts.factory.createObjectLiteralExpression(objectProperties);
}

function getFieldValuesExpression(propertyValues: PropertyValue[]): ts.ArrayLiteralExpression {

    const elements: ts.Expression[] = [];

    for (const v of propertyValues) {
        switch (v.type) {
            case ValueType.Null: {
                elements.push(ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Null))
                ]));
                break;
            }
            case ValueType.Value: {
                elements.push(ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Value)),
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
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Literal)),
                    ts.factory.createPropertyAssignment('value', initializer)
                ]));
                break;
            }
            case ValueType.Object: {
                elements.push(ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Object)),
                    ts.factory.createPropertyAssignment('value', getObjectExpression(v.value))
                ]));
                break;
            }
            case ValueType.Array: {
                elements.push(ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Array)),
                    ts.factory.createPropertyAssignment('value', getFieldValuesExpression(v.value))
                ]));
                break;
            }
            case ValueType.Any: {
                elements.push(ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Any))
                ]));
                break;
            }
            case ValueType.Tuple: {
                const arrayTypes = v.value.map(tv => getFieldValuesExpression(tv));

                const arrayEx = ts.factory.createArrayLiteralExpression(arrayTypes);

                const jsonSchemaEx = ts.factory.createObjectLiteralExpression([
                    ts.factory.createPropertyAssignment('type', ts.factory.createStringLiteral(ValueType.Array)),
                    ts.factory.createPropertyAssignment('value', arrayEx)
                ]);

                elements.push(jsonSchemaEx);
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

