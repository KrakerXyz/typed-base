
import { TypedEntity } from '../../src/orm/TypedEntity';

export type Id = `${string}-${string}-${string}-${string}-${string}`;
export type IdRev = `${Id}/${number}`;
export type IdRevLatest = `${Id}/latest`;

export interface Flow {
    id: IdRev,
    name: string,
    description: string | null,
    setup: FlowSetup,
    actions: Action[],
}

export interface FlowSetup {
    variables: Variable[],
}

export interface Variable {
    name: string,
    value: string | boolean | null,
}

export type Action = CreateWidgetAction | MethodCallAction;

interface CreateWidgetAction {
    id: Id,
    name: 'create-widget',
    widgetId: IdRev | IdRevLatest,
}

interface MethodCallAction {
    id: Id,
    name: 'method-call',
    widgetSource: {
        type: 'widget-name',
        name: string,
    } | {
        type: 'create-action-id',
        actionId: Id,
    },
    methodName: string,
}


const _ = new TypedEntity<Flow>();
