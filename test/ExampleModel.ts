
export interface ExampleModel {
   id: string;
   created: number;
   name: string;
   description: string | null;
   imUndefinable?: string;
   inner: InnerModel | null;
}

export interface InnerModel {
   id: string;
   hasGood: boolean;
   //enumNumber: EnumNumberTest;
   //enumString: EnumStringTest | null;

}

export enum EnumNumberTest {
   One,
   Two
}

export enum EnumStringTest {
   Foo = 'foo',
   Bar = 'bar'
}