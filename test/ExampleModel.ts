
export interface ExampleModel {
   id?: string | number | null;
   created: number;
   name: string;
   imUndefinable?: string;
   inner: InnerModel;
   enumNumber: EnumNumberTest;
   enumStringOrNull: EnumStringTest | null;
   arrayString: string[];
   stringOrArrayNumber: string | number[];
   arrayOfNumberOrString: (string | number)[];
}

export interface InnerModel {
   id: string;
   hasGood: boolean;
}

export enum EnumNumberTest {
   One,
   Two
}

export enum EnumStringTest {
   Foo = 'foo',
   Bar = 'bar'
}