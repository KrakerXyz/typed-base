
import { TypedEntity } from '../../src/orm/TypedEntity';

interface TestType {
    id: string,
    actions: Action[],
}

type Action = TestAction | TestAction2;

interface TestAction {
    name: 'one',
    twp: number,
}

interface TestAction2 {
    name: 'two',
    other: boolean,
}

const _ = new TypedEntity<TestType>();
