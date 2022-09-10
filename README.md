
# Installation

```
npm install -D typed-base
```

# Transformer setup
The library works by what of a "transformer" plugin that runs during TSC compilation. We need to tell TSC to run the transformer by adding it to your tsconfig.json plugins array.
```json
{
    "compilerOptions": {
        ...,
        "plugins": [
            {
                "transform": "@krakerxyz/typed-base/dist/cjs/transformer/transform",
                "collectionNamingStrategy": "kebab"
            }
        ]
    }
}
```

## Plugin Options

### <u>collectionNamingStrategy</u>
Controls the name the collection is given for a interface.
- ***camel*** - BookAuthors -> bookAuthors
- ***kebab*** - BookAuthors ->  book-authors
- ***snake*** - BookAuthors -> book_authors
- ***pascal*** - bookAuthors -> BookAuthors

# Configuring DB
When our application starts, we need to make a call to configureDb to setup the connection string and db name that all our entities will use

```typescript
import { configureDb } from '@krakerxyz/typed-base';

configuredDb({
    dbName: 'my-db',
    uri: 'mongodb://[connectionString]'
})
```

# Usage
```typescript
import { TypedEntity } from '@krakerxyz/typed-base'

interface Author {
    id: string;
    name: string;
    created: number;
}

const authorEntity = new TypedEntity<Author>();

const author = await author.findOne({id: 'id-1'});

```