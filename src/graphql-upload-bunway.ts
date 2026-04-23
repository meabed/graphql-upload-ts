import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { HttpError } from 'http-errors';
import {
  processRequest as defaultProcessRequest,
  type GraphQLOperation,
  type IncomingReq,
  type UploadOptions,
} from './process-request';

// ---------------------------------------------------------------------------
// Bunway compatibility layer
// ---------------------------------------------------------------------------
// `graphql-upload-ts` has historically targeted Node's Express/Koa runtime
// where the request is an `IncomingMessage` (a Readable stream) and the
// response is an EventEmitter-backed `ServerResponse`. Bunway runs on
// Bun.serve and exposes a `BunRequest` whose body is available as bytes via
// `await req.rawBody()` and a `BunResponse` that has no EventEmitter surface.
//
// This middleware bridges those two models: it buffers the multipart body,
// wraps it in a Node `Readable` that ALSO carries the plain headers / url /
// method fields busboy reads synchronously, and shims `.once` / `.on` on the
// response so capacitor cleanup can still be wired.
//
// It does NOT depend on Express or Koa types — consumers pass duck-typed
// `BunRequest` / `BunResponse` shapes (see `BunRequestLike` / `BunResponseLike`
// below) and the returned middleware has Bunway's `(req, res, next)` shape.

/**
 * Minimal shape of a Bunway `BunRequest` that `graphqlUploadBunway` reads.
 * Only the surface area actually used is required so consumers aren't locked
 * into a specific bunway version or even a specific framework.
 */
export interface BunRequestLike {
  /** Original Fetch Request that bun gave the router. Must expose the URL,
   *  method, and Fetch `Headers` used to drive busboy. */
  original: {
    url: string;
    method: string;
    headers: {
      get(name: string): string | null;
      forEach(cb: (value: string, key: string) => void): void;
    };
  };
  /** Returns the original multipart request bytes. Bunway stashes these
   *  before its body-parser consumes the body. */
  rawBody(): Promise<Uint8Array>;
  /** Populated by this middleware on success (the parsed GraphQL operation
   *  with `FileUpload` scalars substituted). Downstream handlers read this. */
  body?: unknown;
}

/**
 * Minimal shape of a Bunway `BunResponse`. We install `.once` / `.on` shims
 * if they are missing, and call the existing `.end` / `.status` on errors.
 */
export interface BunResponseLike {
  status(code: number): BunResponseLike;
  end(body?: unknown): unknown;
  once?(event: string, listener: (...args: unknown[]) => void): BunResponseLike;
  on?(event: string, listener: (...args: unknown[]) => void): BunResponseLike;
}

export type BunwayNextFunction = (err?: unknown) => void;

export type BunwayHandler = (
  req: BunRequestLike,
  res: BunResponseLike,
  next: BunwayNextFunction
) => void;

type ProcessRequestFn = <T = GraphQLOperation | GraphQLOperation[]>(
  req: IncomingReq,
  res: Pick<ServerResponse, 'once'>,
  options?: UploadOptions
) => Promise<T>;

export interface GraphqlUploadBunwayOptions extends UploadOptions {
  processRequest?: ProcessRequestFn;
}

/**
 * Creates a Bunway middleware for handling GraphQL multipart requests.
 *
 * @example
 * ```ts
 * import bunway from 'bunway';
 * import { graphqlUploadBunway } from 'graphql-upload-ts';
 * import { createYoga } from 'graphql-yoga';
 *
 * const app = bunway();
 * const yoga = createYoga({ schema, multipart: false });
 *
 * app.all(
 *   '/graphql',
 *   graphqlUploadBunway({ maxFileSize: 20_000_000, maxFiles: 10 }),
 *   yogaToBunwayHandler(yoga),
 * );
 * ```
 *
 * On success the middleware sets `req.body` to the parsed GraphQL operation
 * with `FileUpload` scalars substituted into the `variables` tree, then calls
 * `next()`. On a parse/validation error it calls `next(error)` with an
 * `HttpError` the caller can translate to a status code.
 */
export function graphqlUploadBunway(options: GraphqlUploadBunwayOptions = {}): BunwayHandler {
  const { processRequest = defaultProcessRequest, ...uploadOptions } = options;

  return function graphqlUploadBunwayMiddleware(
    req: BunRequestLike,
    res: BunResponseLike,
    next: BunwayNextFunction
  ): void {
    const contentType = (req.original.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.startsWith('multipart/')) {
      next();
      return;
    }

    // Kick off the async flow in a detached promise so we can keep the
    // middleware's synchronous signature (matches every other graphql-upload-ts
    // middleware).
    void (async () => {
      let rawBody: Uint8Array;
      try {
        rawBody = await req.rawBody();
      } catch (err) {
        next(err);
        return;
      }

      // Plain headers record for busboy (it iterates `req.headers` as an
      // object). Bunway/Fetch `Headers` expose `get` + `forEach`, not
      // object-property access, so we materialize a record up-front.
      const headers: Record<string, string> = {};
      req.original.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Readable that yields the captured bytes. busboy pipes it; nothing
      // else should attach data/end listeners first, or it will switch to
      // flowing mode and the parser will see an empty stream.
      const nodeReadable = Readable.from([Buffer.from(rawBody)]);

      const shimReq = nodeReadable as unknown as IncomingMessage & { body: unknown };
      (shimReq as unknown as { headers: Record<string, string> }).headers = headers;
      (shimReq as unknown as { url: string }).url = req.original.url;
      (shimReq as unknown as { method: string }).method = req.original.method;
      shimReq.body = null;

      // Bunway's BunResponse has no EventEmitter surface. Install a minimal
      // `.once` / `.on` backed by an internal EventEmitter so graphql-upload
      // can register its capacitor cleanup listeners, and fire 'close' when
      // `res.end()` runs.
      const resEmitter = new EventEmitter();
      const hadOnce = typeof res.once === 'function';
      if (!hadOnce) {
        (res as unknown as { once: BunResponseLike['once'] }).once = ((
          event: string,
          listener: (...args: unknown[]) => void
        ) => {
          resEmitter.once(event, listener);
          return res;
        }) as BunResponseLike['once'];
        (res as unknown as { on: BunResponseLike['on'] }).on = ((
          event: string,
          listener: (...args: unknown[]) => void
        ) => {
          resEmitter.on(event, listener);
          return res;
        }) as BunResponseLike['on'];
        const originalEnd = res.end.bind(res) as BunResponseLike['end'];
        res.end = ((...args: Parameters<BunResponseLike['end']>) => {
          const ret = originalEnd(...args);
          resEmitter.emit('close');
          return ret;
        }) as BunResponseLike['end'];
      }

      try {
        const body = await processRequest(
          shimReq as unknown as IncomingReq,
          res as unknown as Pick<ServerResponse, 'once'>,
          uploadOptions
        );
        req.body = body;
        shimReq.body = body;
        next();
      } catch (err) {
        const httpErr = err as HttpError | Error;
        if ('status' in httpErr && 'expose' in httpErr && (httpErr as HttpError).expose) {
          res.status((httpErr as HttpError).status);
        }
        next(err);
      }
    })();
  };
}
