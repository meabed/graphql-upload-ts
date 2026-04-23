## Bunway GraphQL Upload Example

This example shows how to use `graphql-upload-ts` with [Bunway](https://bunway.jointops.dev/)
(a Bun-native, Express-compatible HTTP framework) and [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server).

### Usage

```bash
# Install dependencies
bun install

# Start the server with graphql-yoga
bun run graphql-yoga.ts

# Test upload with cURL
./upload.sh http://localhost:4000/graphql test.png
```

### Key Pieces

#### 1. `graphqlUploadBunway` middleware

Mount it in front of the Yoga handler. It buffers the multipart body via
`req.rawBody()`, feeds a Node-stream adapter into `busboy`, and sets
`req.body = { query, variables, … }` with `Upload` instances embedded in
`variables`.

```ts
import { graphqlUploadBunway, GraphQLUpload } from 'graphql-upload-ts';

app.all(
  '/graphql',
  graphqlUploadBunway({ maxFileSize: 20_000_000, maxFiles: 10 }),
  yogaToBunwayHandler(yoga),
);
```

#### 2. Yoga `onRequestParse` plugin

Yoga normally reads the operation from the Fetch Request body. Because
`Upload` instances carry Promises (not JSON-serializable), we stash the
pre-parsed operation on a `WeakMap` keyed by the Fetch Request and a small
plugin returns it via `setRequestParser`:

```ts
const parsedMultipartOperations = new WeakMap<Request, unknown>();
function useBunwayUploadParser(): Plugin {
  return {
    onRequestParse({ request, setRequestParser }) {
      const ct = (request.headers.get('content-type') ?? '').toLowerCase();
      if (!ct.startsWith('multipart/')) return;
      const ops = parsedMultipartOperations.get(request);
      if (ops != null) setRequestParser(async () => ops);
    },
  };
}
```

#### 3. Yoga→Bunway adapter

Bridges Yoga's `fetch` handler to Bunway's `(req, res, next)` contract.
For multipart requests it stashes the pre-parsed operation onto the Fetch
Request before calling `yoga.fetch(...)`.

#### 4. Turn Yoga's built-in multipart OFF

```ts
createYoga({
  schema,
  multipart: false, // graphql-upload-ts handles it
  plugins: [useBunwayUploadParser()],
});
```

### Resolver usage

Identical to the Express flow — the stock `GraphQLUpload` scalar unwraps
`Upload` instances to `Promise<FileUpload>`:

```ts
Mutation: {
  async uploadFile(_root, { file }) {
    const { createReadStream, filename, mimetype } = await file;
    // ... pipe createReadStream() into S3, fs, etc.
  },
}
```

### GraphQL Operations

```graphql
scalar Upload

type Mutation {
  uploadFile(file: Upload!): File!
}
```

### Project Structure

```
bunway/
├── graphql-yoga.ts  # Server implementation using GraphQL Yoga
├── readme.md
```
