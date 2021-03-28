
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


}