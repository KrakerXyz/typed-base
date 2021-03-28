
export class TypedSchema<T> {

   public constructor(readonly schema?: any) {
      this._schema = schema;
   }

   private _schema: any = null;

}