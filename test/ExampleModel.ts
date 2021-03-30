
export interface ExampleModel {
   id?: string | number | null;
   created: number;
   name: string;
   description: string | null;
   imUndefinable?: string;
   inner: InnerModel | null;
   enumNumber: EnumNumberTest;
   enumString: EnumStringTest | null;
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