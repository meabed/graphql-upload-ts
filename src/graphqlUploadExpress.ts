import { processRequest as defaultProcessRequest } from './processRequest';

export type ProcessRequestOptions = {
  processRequest?: ((req: any, res: any, options: any) => Promise<any>) | (() => Promise<void>);
  [key: string]: any;
};

/**
 * Creates [Express](https://expressjs.com) middleware that processes
 * [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec)
 * using [`processRequest`]{@link processRequest}, ignoring non-multipart
 * requests. It sets the request body to be
 * [similar to a conventional GraphQL POST request]{@link GraphQLOperation} for
 * following GraphQL middleware to consume.
 * @kind function
 * @name graphqlUploadExpress
 * @param {ProcessRequestOptions} params Middleware options. Any [`ProcessRequestOptions`]{@link ProcessRequestOptions} can be used.
 * @param {ProcessRequestOptions.processRequest} [params.processRequest=processRequest] Used to process [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec).
 * @returns {Function} Express middleware.
 * @example <caption>Ways to `import`.</caption>
 * ```js
 * import { graphqlUploadExpress } from 'graphql-upload-minimal';
 * ```
 *
 * ```js
 * import graphqlUploadExpress from 'graphql-upload-minimal/public/graphqlUploadExpress.js';
 * ```
 * @example <caption>Ways to `require`.</caption>
 * ```js
 * const { graphqlUploadExpress } = require('graphql-upload-minimal');
 * ```
 *
 * ```js
 * const graphqlUploadExpress = require('graphql-upload-minimal/public/graphqlUploadExpress');
 * ```
 * @example <caption>Basic [`express-graphql`](https://npm.im/express-graphql) setup.</caption>
 * ```js
 * const express = require('express');
 * const graphqlHTTP = require('express-graphql');
 * const { graphqlUploadExpress } = require('graphql-upload-minimal');
 * const schema = require('./schema');
 *
 * express()
 *   .use(
 *     '/graphql',
 *     graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
 *     graphqlHTTP({ schema })
 *   )
 *   .listen(3000);
 * ```
 */
export function graphqlUploadExpress(params: ProcessRequestOptions = {}) {
  const { processRequest = defaultProcessRequest, ...processRequestOptions } = params;
  return function graphqlUploadExpressMiddleware(request: any, response: any, next: any) {
    if (!request.is('multipart/form-data')) return next();

    processRequest(request, response, processRequestOptions)
      .then((body: any) => {
        request.body = body;
        next();
      })
      .catch((error: any) => {
        if (error.status && error.expose) response.status(error.status);
        next(error);
      });
  };
}
