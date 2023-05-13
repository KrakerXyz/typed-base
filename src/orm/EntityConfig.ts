
export enum ValueType {
    Null = 'nil',
    Value = 'val',
    Literal = 'lit',
    Object = 'obj',
    Array = 'arr',
    Any = 'any',
    Tuple = 'tup'
}

export interface EntityConfig {
    name: string,
    fields: FieldConfig,
}

export type FieldConfig = Record<string, { allowUndefined: boolean, values: FieldValue[] }>

export type FieldValue = LiteralValue | ObjectValue | ValueValue | ArrayValue | NullValue | AnyValue;

export interface NullValue {
    type: ValueType.Null,
}

export interface AnyValue {
    type: ValueType.Any,
}

export interface ValueValue {
    type: ValueType.Value,
    value: 'number' | 'string' | 'boolean',
}

/** Represents a set of literal values that are acceptable for a field. A typical use case if for enum values where the values list would be a number for each index of the enum */
export interface LiteralValue {
    type: ValueType.Literal,
    value: number | string | boolean,
}

export interface ObjectValue {
    type: ValueType.Object,
    value: FieldConfig,
}

export interface ArrayValue {
    type: ValueType.Array,
    value: FieldValue[],
}