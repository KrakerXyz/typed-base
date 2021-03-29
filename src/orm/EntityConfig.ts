
export interface EntityConfig {
   fields: FieldConfig
}

export type FieldConfig = Record<string, Field[]>

export type Field = LiteralValue | ObjectValue | ValueValue | ArrayValue;

export enum ValueType {
   Value,
   Literal,
   Object,
   Array
}

export interface ValueValue {
   type: ValueType.Value;
   allowUndefined: boolean;
   allowNull: boolean;
   values: ('number' | 'string' | 'boolean')[];
}

/** Represents a set of literal values that are acceptable for a field. A typical use case if for enum values where the values list would be a number for each index of the enum */
export interface LiteralValue {
   type: ValueType.Literal;
   allowUndefined: boolean;
   allowNull: boolean;
   value: number | string | boolean;
}

export interface ObjectValue {
   type: ValueType.Object;
   allowUndefined: boolean;
   allowNull: boolean;
   value: FieldConfig;
}

export interface ArrayValue {
   type: ValueType.Array;
   allowUndefined: boolean;
   allowNull: boolean;
   value: Field
}