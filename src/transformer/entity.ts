import * as ts from 'typescript';
import { createProperty, Properties } from './properties';

export function createEntity(typeChecker: ts.TypeChecker, node: ts.TypeNode): Entity {

    let entityType = typeChecker.getTypeFromTypeNode(node);

    let isArray = false;
    if (ts.isArrayTypeNode(node)) {
        isArray = true;

        if (node.elementType.kind !== ts.SyntaxKind.LiteralType && node.elementType.kind !== ts.SyntaxKind.TypeReference) {
            throw new Error('Schema generation for non-object array types are not yet supported');
        }

        entityType = typeChecker.getTypeFromTypeNode(node.elementType);
    }

    const allowedTypes = getEntityTypes(typeChecker, entityType);

    return {
        isArray,
        allowedTypes
    };
}

function getEntityTypes(typeChecker: ts.TypeChecker, type: ts.Type): EntityType[] {
    if (type.isUnion()) {
        const types = type.types;
        const unionEntities = types.map(t => getEntityTypeFromType(typeChecker, t));
        return unionEntities;
    }

    const entity = getEntityTypeFromType(typeChecker, type);
    return [entity];
}

function getEntityTypeFromType(typeChecker: ts.TypeChecker, type: ts.Type): EntityType {
    const symbols = typeChecker.getPropertiesOfType(type);

    const properties = symbols.reduce((p, sym) => {
        try {
            const prop = createProperty(typeChecker, sym);
            return { ...p, [sym.name]: prop };
        } catch (e) {
            throw new Error(`Error generating property for ${sym.name}: ${e}`);
        }
    }, {} as EntityType['properties']);

    return {
        properties
    };
}

export interface Entity {
    isArray: boolean,
    allowedTypes: EntityType[],
}

export interface EntityType {
    properties: Properties,
}