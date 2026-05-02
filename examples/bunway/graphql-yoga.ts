import { createWriteStream } from 'node:fs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import bunway, { type BunRequest, type BunResponse, cors, type Handler, json, urlencoded } from 'bunway';
import { createYoga, type Plugin, type YogaServerInstance } from 'graphql-yoga';
import { type FileUpload, GraphQLUpload, graphqlUploadBunway } from '../../src';

// ---------------------------------------------------------------------------
// Bunway + Yoga + graphql-upload-ts end-to-end example
// ---------------------------------------------------------------------------
// Demonstrates how to wire `graphqlUploadBunway` in front of a Yoga server
// mounted on Bunway. Three moving parts:
//
//   1. `graphqlUploadBunway` parses the multipart body, resolves files to
//      `FileUpload` objects, and sets `req.body = { query, variables, ... }`
//      with `Upload` class instances embedded in the variables tree.
//
//   2. A small Yoga `Plugin` (`useBunwayUploadParser`) picks up the pre-
//      parsed operation via `setRequestParser` so Yoga runs the operation
//      with `Upload` instances preserved — NOT JSON-serialized (which
//      would clobber the Promise/Upload object identity).
//
//   3. `yogaToBunwayHandler` bridges Yoga's Web-standard `fetch` interface
//      onto Bunway's `(req, res, next)` middleware contract, forwarding the
//      reconstructed Request to Yoga and streaming the Response back.

async function saveFileFromStream(stream: NodeJS.ReadableStream, filename: string) {
  let fileSize = 0;
  const outFilePath = `${__dirname}/uploaded-${Date.now()}-${filename}`;
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => {
      fileSize += chunk.length;
    });
    stream
      .pipe(createWriteStream(outFilePath))
      .on('finish', () => resolve())
      .on('error', reject);
  });
  return { filename, fileSize, uri: outFilePath };
}

const gqlSchema = makeExecutableSchema({
  typeDefs: `#graphql
    scalar Upload
    type File {
      uri: String!
      filename: String!
      mimetype: String!
      encoding: String!
      fileSize: Int!
    }
    type Query { hello: String! }
    type Mutation {
      uploadFile(file: Upload!): File!
    }
  `,
  resolvers: {
    Upload: GraphQLUpload,
    Query: { hello: () => 'Hello Bunway' },
    Mutation: {
      uploadFile: async (_ctx, args) => {
        const { file } = args as { file: Promise<FileUpload> };
        const { createReadStream, filename, mimetype, encoding } = await file;
        const result = await saveFileFromStream(createReadStream(), filename);
        return { filename, mimetype, encoding, fileSize: result.fileSize, uri: result.uri };
      },
    },
  },
});

// Side-table the Yoga request-parser plugin reads from. Keyed by the Fetch
// `Request` we build in the Yoga adapter so the GC can reclaim entries once
// the request is done.
const parsedMultipartOperations = new WeakMap<Request, unknown>();

function stashMultipartOperation(request: Request, operation: unknown) {
  parsedMultipartOperations.set(request, operation);
}

function useBunwayUploadParser(): Plugin {
  return {
    onRequestParse({
      request,
      setRequestParser,
    }: {
      request: Request;
      setRequestParser: (parser: (req: Request) => unknown) => void;
    }) {
      const ct = (request.headers.get('content-type') ?? '').toLowerCase();
      if (!ct.startsWith('multipart/')) return;
      const operations = parsedMultipartOperations.get(request);
      if (operations == null) return;
      setRequestParser(async () => operations);
    },
  } as unknown as Plugin;
}

function yogaToBunwayHandler<TServerContext extends Record<string, unknown> = Record<string, unknown>>(
  yoga: YogaServerInstance<TServerContext, Record<string, unknown>>
): Handler {
  return async (req: BunRequest, res: BunResponse, next) => {
    try {
      const method = req.original.method.toUpperCase();
      let fetchRequest: Request;
      if (method === 'GET' || method === 'HEAD') {
        fetchRequest = req.original;
      } else {
        const headers: Record<string, string> = {};
        req.original.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const ct = (req.original.headers.get('content-type') ?? '').toLowerCase();
        if (ct.startsWith('multipart/')) {
          // `graphqlUploadBunway` already consumed the body and populated
          // `req.body`. Hand Yoga an empty-bodied Request with the multipart
          // content-type preserved so the plugin above recognizes it.
          fetchRequest = new Request(req.original.url, {
            method: req.original.method,
            headers,
            body: '',
          });
          stashMultipartOperation(fetchRequest, req.body);
        } else {
          const raw = await req.rawBody();
          fetchRequest = new Request(req.original.url, {
            method: req.original.method,
            headers,
            body: raw.byteLength > 0 ? (raw as BodyInit) : undefined,
          });
        }
      }

      const response = await yoga.fetch(fetchRequest, { req, res } as unknown as TServerContext);

      res.status(response.status);
      response.headers?.forEach((value, key) => res.set(key, value));

      if (!response.body) {
        res.end();
        return;
      }
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(value);
      }
      res.end();
    } catch (err) {
      next(err);
    }
  };
}

// ---------------------------------------------------------------------------
// Server wiring
// ---------------------------------------------------------------------------

const yoga = createYoga({
  schema: gqlSchema,
  // Crucial: Yoga's own multipart parser MUST be off so `graphqlUploadBunway`
  // is the single parser of apollo-upload-spec requests.
  multipart: false,
  plugins: [useBunwayUploadParser()],
  maskedErrors: false,
});

const app = bunway();
app.use(cors({ origin: true, credentials: true }));
app.use(urlencoded({ extended: true }));
app.use(json());

app.all(
  '/graphql',
  graphqlUploadBunway({ maxFileSize: 20_000_000, maxFiles: 10 }) as unknown as Handler,
  yogaToBunwayHandler(yoga as unknown as Parameters<typeof yogaToBunwayHandler>[0])
);

const port = Number(process.env.PORT ?? 4000);
const server = app.listen({ port });
// eslint-disable-next-line no-console
console.info(`🚀 Server ready at http://localhost:${server.port}/graphql`);
