import { processRequest as defaultProcessRequest } from './processRequest';
import { Context, Next } from 'koa';

type ProcessRequestOptions = {
  processRequest?: ((req: any, res: any, options: any) => Promise<any>) | (() => Promise<void>);
  maxFieldSize?: number;
  maxFileSize?: number;
  maxFiles?: number;
  [key: string]: any;
};

/**
 * Creates [Koa](https://koajs.com) middleware that processes
 * [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec)
 * using [`processRequest`]{@link processRequest}, ignoring non-multipart
 * requests. It sets the request body to be
 * [similar to a conventional GraphQL POST request]{@link GraphQLOperation} for
 * following GraphQL middleware to consume.
 * @example <caption>Ways to `import`.</caption>
 * ```js
 * import { graphqlUploadKoa } from 'graphql-upload-ts';
 * ```
 *
 * ```js
 * import graphqlUploadKoa from 'graphql-upload-ts/dist/graphqlUploadKoa.js';
 * ```
 * @example <caption>Ways to `require`.</caption>
 * ```js
 * const { graphqlUploadKoa } = require('graphql-upload-ts');
 * ```
 *
 * ```js
 * const graphqlUploadKoa = require('graphql-upload-ts/dist/graphqlUploadKoa');
 * ```
 * @example <caption>Basic [`graphql-api-koa`](https://npm.im/graphql-api-koa) setup.</caption>
 * ```js
 * const Koa = require('koa');
 * const bodyParser = require('koa-bodyparser');
 * const { errorHandler, execute } = require('graphql-api-koa');
 * const { graphqlUploadKoa } = require('graphql-upload-ts');
 * const schema = require('./schema');
 *
 * new Koa()
 *   .use(errorHandler())
 *   .use(bodyParser())
 *   .use(graphqlUploadKoa({ maxFileSize: 10000000, maxFiles: 10 }))
 *   .use(execute({ schema }))
 *   .listen(3000);
 * ```
 */
export function graphqlUploadKoa(params: ProcessRequestOptions = {}) {
  const { processRequest = defaultProcessRequest, ...processRequestOptions } = params;
  return async function graphqlUploadKoaMiddleware(ctx: Context, next: Next) {
    if (!ctx.request.is('multipart/form-data')) return next();

    const finished = new Promise((resolve) => ctx.req.on('end', resolve));

    try {
      ctx.body = await processRequest(ctx.req, ctx.res, processRequestOptions);
      await next();
    } finally {
      await finished;
    }
  };
}
