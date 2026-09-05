import { describe, it } from 'bun:test';
import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import FormData from 'form-data';
import createHttpError from 'http-errors';
import { type BunRequestLike, type BunResponseLike, graphqlUploadBunway, processRequest, Upload } from '../src';

// ---------------------------------------------------------------------------
// Minimal Bunway-shaped mocks
// ---------------------------------------------------------------------------
// The Bunway adapter accepts anything that quacks like `BunRequestLike` /
// `BunResponseLike`, so tests can exercise the middleware in isolation without
// pulling in the actual bunway runtime (which would require a real server).

function buildForm(build: (fd: FormData) => void): {
  headers: Record<string, string>;
  body: Buffer;
} {
  const fd = new FormData();
  build(fd);
  // `form-data` v4 can render a synchronous buffer via `getBuffer()`, but we
  // still need its computed headers (including the multipart boundary).
  const headers = fd.getHeaders();
  const body = fd.getBuffer();
  return { headers, body };
}

function buildBunRequest(headers: Record<string, string>, body: Buffer): BunRequestLike {
  const fetchHeaders = new Headers(headers);
  return {
    original: {
      url: 'http://localhost/graphql',
      method: 'POST',
      headers: {
        get: (name: string) => fetchHeaders.get(name),
        forEach: (cb: (value: string, key: string) => void) => fetchHeaders.forEach(cb),
      },
    },
    rawBody: async () => new Uint8Array(body),
    body: undefined,
  };
}

function buildBunResponse(): BunResponseLike & { _statusCode: number; _ended: boolean } {
  const res = {
    _statusCode: 200,
    _ended: false,
    status(code: number) {
      res._statusCode = code;
      return res;
    },
    end() {
      res._ended = true;
      return res;
    },
  } as BunResponseLike & { _statusCode: number; _ended: boolean };
  return res;
}

describe('graphqlUploadBunway', () => {
  it('passes non-multipart requests through to `next()` without parsing', async () => {
    let processRequestRan = false;
    const mw = graphqlUploadBunway({
      async processRequest() {
        processRequestRan = true;
        return {} as never;
      },
    });

    const req: BunRequestLike = {
      original: {
        url: 'http://localhost/graphql',
        method: 'POST',
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
          forEach: () => undefined,
        },
      },
      rawBody: async () => new Uint8Array(0),
    };
    const res = buildBunResponse();

    await new Promise<void>((resolve, reject) => {
      mw(req, res, (err) => {
        if (err) reject(err as Error);
        else resolve();
      });
    });

    strictEqual(processRequestRan, false, 'processRequest should not run for non-multipart');
  });

  it('parses a multipart request and populates `req.body` with the GraphQL operation', async () => {
    const { headers, body } = buildForm((fd) => {
      fd.append(
        'operations',
        JSON.stringify({
          query: 'mutation($file: Upload!){ up(file: $file) }',
          variables: { file: null },
        })
      );
      fd.append('map', JSON.stringify({ 1: ['variables.file'] }));
      fd.append('1', 'hello bunway', { filename: 'hello.txt', contentType: 'text/plain' });
    });

    const mw = graphqlUploadBunway();
    const req = buildBunRequest(headers, body);
    const res = buildBunResponse();

    await new Promise<void>((resolve, reject) => {
      mw(req, res, (err) => {
        if (err) reject(err as Error);
        else resolve();
      });
    });

    ok(req.body, 'req.body should be populated');
    const parsed = req.body as { query: string; variables: { file: Upload } };
    strictEqual(parsed.query, 'mutation($file: Upload!){ up(file: $file) }');
    // `processRequest` stores `Upload` class instances inside `variables`;
    // the `GraphQLUpload` scalar unwraps to `Upload#promise` in resolvers.
    ok(parsed.variables.file instanceof Upload, 'variables.file should be an Upload instance');
    const upload = await parsed.variables.file.promise;
    strictEqual(upload.filename, 'hello.txt');
    strictEqual(upload.mimetype, 'text/plain');

    // The `createReadStream` API produced by `processRequest` should work
    // identically to the Express middleware.
    const chunks: Buffer[] = [];
    const stream = upload.createReadStream();
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    strictEqual(Buffer.concat(chunks).toString('utf-8'), 'hello bunway');
  });

  it('delegates to a caller-supplied `processRequest` when provided', async () => {
    let processRequestRan = false;
    const mw = graphqlUploadBunway({
      processRequest(...args) {
        processRequestRan = true;
        return processRequest(...args);
      },
    });

    const { headers, body } = buildForm((fd) => {
      fd.append('operations', JSON.stringify({ variables: { file: null } }));
      fd.append('map', JSON.stringify({ 1: ['variables.file'] }));
      fd.append('1', 'payload', { filename: 'a.txt' });
    });

    const req = buildBunRequest(headers, body);
    const res = buildBunResponse();

    await new Promise<void>((resolve, reject) => {
      mw(req, res, (err) => {
        if (err) reject(err as Error);
        else resolve();
      });
    });

    strictEqual(processRequestRan, true);
    ok((req.body as { variables: { file: Upload } }).variables.file instanceof Upload);
  });

  it('shimmed `.once` / `.on` / `.end` on response propagate `close` events for capacitor cleanup', async () => {
    const events: string[] = [];
    const mw = graphqlUploadBunway();

    const { headers, body } = buildForm((fd) => {
      fd.append('operations', JSON.stringify({ variables: { file: null } }));
      fd.append('map', JSON.stringify({ 1: ['variables.file'] }));
      fd.append('1', 'x', { filename: 'x.txt' });
    });

    const req = buildBunRequest(headers, body);
    const res = buildBunResponse();

    await new Promise<void>((resolve, reject) => {
      mw(req, res, (err) => {
        if (err) reject(err as Error);
        else resolve();
      });
    });

    // The middleware should have installed `.once` — register a listener and
    // verify it fires when the response ends.
    ok(typeof res.once === 'function', 'res.once should be installed');
    (res.once as (event: string, listener: (...args: unknown[]) => void) => void)('close', () => {
      events.push('close');
    });

    res.end();

    deepStrictEqual(events, ['close']);
  });

  it('forwards HTTP errors raised by `processRequest` to `next()` and sets the response status', async () => {
    const httpError = createHttpError(413, 'File too big');
    const mw = graphqlUploadBunway({
      async processRequest() {
        throw httpError;
      },
    });

    const { headers, body } = buildForm((fd) => {
      fd.append('operations', JSON.stringify({ variables: { file: null } }));
      fd.append('map', JSON.stringify({ 1: ['variables.file'] }));
      fd.append('1', 'x', { filename: 'x.txt' });
    });

    const req = buildBunRequest(headers, body);
    const res = buildBunResponse();

    const err = await new Promise<unknown>((resolve) => {
      mw(req, res, (e) => resolve(e));
    });

    strictEqual(err, httpError);
    strictEqual(res._statusCode, 413);
  });
});
