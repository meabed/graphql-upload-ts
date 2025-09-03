import type { ServerResponse } from 'node:http';
import type { Context, Next } from 'koa';
import {
  processRequest as defaultProcessRequest,
  type GraphQLOperation,
  type IncomingReq,
  type UploadOptions,
} from './process-request';

type ProcessRequestFn = <T = GraphQLOperation | GraphQLOperation[]>(
  req: IncomingReq,
  res: Pick<ServerResponse, 'once'>,
  options?: UploadOptions
) => Promise<T>;

export interface GraphqlUploadKoaOptions extends UploadOptions {
  processRequest?: ProcessRequestFn;
}

/**
 * Creates Koa middleware for handling GraphQL multipart requests (file uploads).
 * This middleware processes multipart/form-data requests and converts them into a format
 * that GraphQL servers can understand.
 *
 * @example Basic setup with Apollo Server Koa
 * ```typescript
 * import Koa from 'koa';
 * import { graphqlUploadKoa } from 'graphql-upload-ts';
 * import { ApolloServer } from '@apollo/server';
 * import { koaMiddleware } from '@as-integrations/koa';
 *
 * const app = new Koa();
 *
 * app.use(
 *   graphqlUploadKoa({
 *     maxFileSize: 10_000_000, // 10MB
 *     maxFiles: 10
 *   })
 * );
 *
 * // Apollo Server setup continues...
 * ```
 */
export function graphqlUploadKoa(
  options: GraphqlUploadKoaOptions = {}
): (ctx: Context, next: Next) => Promise<void> {
  const { processRequest = defaultProcessRequest, ...uploadOptions } = options;

  return async function graphqlUploadKoaMiddleware(ctx: Context, next: Next): Promise<void> {
    if (!ctx.request.is('multipart/form-data')) {
      return next();
    }

    const finished = new Promise<void>((resolve) => {
      ctx.req.on('end', resolve);
    });

    try {
      ctx.body = await processRequest(ctx.req as IncomingReq, ctx.res, uploadOptions);
      await next();
    } finally {
      await finished;
    }
  };
}
