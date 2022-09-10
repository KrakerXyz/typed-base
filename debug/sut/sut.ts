
import { TypedEntity } from '../../src/orm/TypedEntity';

type AnimationVersion = number | 'draft';

interface Animation {
    id: string;
    version: AnimationVersion;
}

const _ = new TypedEntity<Animation>();
