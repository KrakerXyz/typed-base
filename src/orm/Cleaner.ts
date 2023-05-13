
import { FieldConfig, FieldValue, LiteralValue, ValueValue, ValueType } from './EntityConfig';

export class Cleaner<T extends Record<string, any>> {

    private readonly _cleaner: ObjectCleaner;
    public constructor(config: FieldConfig) {
        this._cleaner = new ObjectCleaner(config, false, false);
    }

    public clean(value: any): T {
        const t = this._cleaner.clean(value);
        return t;
    }

}

class ObjectCleaner {

    private readonly _rules: { key: string, valueCleaner: ValuesCleaner }[];

    public constructor(fieldConfig: FieldConfig, private readonly _allowUndefined: boolean, private readonly _allowNull: boolean) {
        this._rules = [];
        for (const key of Object.getOwnPropertyNames(fieldConfig)) {
            const value = fieldConfig[key];
            this._rules.push({ key, valueCleaner: new ValuesCleaner(value.allowUndefined, value.values) });
        }
    }

    public clean(value: any): any {

        if (!value || typeof value !== 'object') {
            if (this._allowUndefined) { return undefined; }
            if (this._allowNull) { return null; }
        }

        const t: any = {};
        for (const r of this._rules) {
            const tValue = value[r.key];
            const cleaned = r.valueCleaner.clean(tValue).value;
            if (cleaned === undefined) { continue; }
            t[r.key] = cleaned;
        }
        return t;
    }

}

type CleanResult = { match: 'exact' | 'infer' | 'default', value: any };

interface Clean {
    clean(value: any): CleanResult,
}

class ValuesCleaner implements Clean {

    private readonly _allowNull: boolean;
    private readonly _cleaners: Clean[];

    public constructor(private readonly _allowUndefined: boolean, values: FieldValue[]) {
        this._allowNull = false;
        this._cleaners = [];

        //Because Null could come after other types that depend on knowing if it's nullable we need to check ahead of time
        this._allowNull = values.some(v => v.type === ValueType.Null);

        for (const value of values) {
            switch (value.type) {
                case ValueType.Null: {
                    //For never type checking
                    break;
                }
                case ValueType.Value: {
                    this._cleaners.push(new ValueCleaner(value));
                    break;
                }
                case ValueType.Literal: {
                    this._cleaners.push(new LiteralCleaner(value));
                    break;
                }
                case ValueType.Object: {
                    const cleaner = new ObjectCleaner(value.value, _allowUndefined, this._allowNull);
                    this._cleaners.push({
                        clean(v) {
                            const o = cleaner.clean(v);
                            return { match: 'infer', value: o };
                        }
                    });
                    break;
                }
                case ValueType.Array: {
                    const valueCleaner = new ValuesCleaner(false, value.value);
                    this._cleaners.push({
                        clean(v) {
                            if (!Array.isArray(v)) { return { match: 'default', value: [] }; }
                            const result = v.map(i => valueCleaner.clean(i));
                            return { match: 'exact', value: result };
                        }
                    });
                    break;
                }
                case ValueType.Any: {
                    this._cleaners.push({
                        clean(v) {
                            return { match: 'infer', value: v };
                        }
                    });
                    break;
                }
                default: {
                    const _: never = value;
                }
            }
        }
    }

    public clean(value: any): CleanResult {

        if (value === undefined) {
            if (this._allowUndefined) { return { match: 'exact', value: undefined }; }
            if (this._allowNull) { return { match: 'infer', value: null }; }
        } else if (value === null) {
            if (this._allowNull) { return { match: 'exact', value: null }; }
            if (this._allowUndefined) { return { match: 'infer', value: undefined }; }
        }

        let firstInfer: CleanResult | null = null;
        let firstNone: CleanResult | null = null;
        for (const cleaner of this._cleaners) {
            const r = cleaner.clean(value);
            if (r.match === 'exact') { return r; }
            if (!firstInfer && r.match === 'infer') { firstInfer = r; }
            if (!firstNone && r.match === 'default') { firstNone = r; }
        }
        if (firstInfer) { return firstInfer; }
        if (this._allowUndefined) { return { match: 'default', value: undefined }; }
        if (this._allowNull) { return { match: 'default', value: null }; }
        if (firstNone) { return firstNone; }
        throw new Error('Could not determine cleaned value');
    }

}

class ValueCleaner implements Clean {

    public constructor(private readonly _value: ValueValue) { }

    public clean(value: any): CleanResult {

        if (typeof value === this._value.value) { return { match: 'exact', value }; }

        switch (this._value.value) {
            case 'string': {
                if (typeof value === 'object') { return { match: 'default', value: '' }; }
                return { match: 'infer', value: value?.toString() ?? '' };
            }
            case 'boolean': {
                if (!value) { return { match: 'infer', value: false }; }
                if (typeof value === 'string') {
                    if (value.toLowerCase() === 'false') { return { match: 'infer', value: false }; }
                    if (value.toLowerCase() === 'true') { return { match: 'infer', value: true }; }
                } else if (typeof value === 'number') {
                    if (value === 0) { return { match: 'infer', value: false }; }
                }

                return { match: 'default', value: false };
            }
            case 'number': {
                const parsed = parseFloat(value);
                if (isFinite(parsed)) { return { match: 'infer', value: parsed }; }
                return { match: 'default', value: 0 };
            }
            default: {
                const _: never = this._value.value;
                return _;
            }
        }
    }

}

class LiteralCleaner implements Clean {

    public constructor(private readonly _literal: LiteralValue) { }

    public clean(value: any): CleanResult {
        if (value === this._literal.value) { return { match: 'exact', value }; }
        if (value === undefined || value === null || value === '') { return { match: 'default', value: this._literal.value }; }

        if (typeof this._literal.value === 'string') {
            if (value.toString() === this._literal.value) { return { match: 'infer', value: value.toString() }; }
            return { match: 'default', value: this._literal.value };
        }

        if (typeof this._literal.value === 'boolean') {
            if (value.toString().toLowerCase() === this._literal.value.toString()) { return { match: 'infer', value: this._literal.value }; }
            return { match: 'default', value: false };
        }

        if (typeof this._literal.value === 'number') {
            if (value.toString() === this._literal.value.toString()) { return { match: 'infer', value: this._literal.value }; }
            return { match: 'default', value: 0 };
        }

        throw new Error('Unknown literal type');
    }

}