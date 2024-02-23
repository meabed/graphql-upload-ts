import { processRequest as defaultProcessRequest } from './processRequest';
import { NextFunction, Request, Response } from 'express';

export type ProcessRequestOptions = {
  processRequest?: ((req: any, res: any, options: any) => Promise<any>) | (() => Promise<void>);
  overrideSendResponse?: boolean;
  maxFieldSize?: number;
  maxFileSize?: number;
  maxFiles?: number;
  [key: string]: any;
};

/**
 * Creates [Express](https://expressjs.com) middleware that processes
 * [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec)
 * using [`processRequest`]{@link processRequest}, ignoring non-multipart
 * requests. It sets the request body to be
 * [similar to a conventional GraphQL POST request]{@link GraphQLOperation} for
 * following GraphQL middleware to consume.
 * @example <caption>Ways to `import`.</caption>
 * ```js
 * import { graphqlUploadExpress } from 'graphql-upload-ts';
 * ```
 *
 * ```js
 * import graphqlUploadExpress from 'graphql-upload-ts/dist/graphqlUploadExpress.js';
 * ```
 * @example <caption>Ways to `require`.</caption>
 * ```js
 * const { graphqlUploadExpress } = require('graphql-upload-ts');
 * ```
 *
 * ```js
 * const graphqlUploadExpress = require('graphql-upload-ts/dist/graphqlUploadExpress');
 * ```
 * @example <caption>Basic [`express-graphql`](https://npm.im/express-graphql) setup.</caption>
 * ```js
 * const express = require('express');
 * const graphqlHTTP = require('express-graphql');
 * const { graphqlUploadExpress } = require('graphql-upload-ts');
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
  const { processRequest = defaultProcessRequest, overrideSendResponse, ...processRequestOptions } = params;
  return function graphqlUploadExpressMiddleware(request: Request, response: Response, next: NextFunction) {
    if (!request.is('multipart/form-data')) return next();

    // if processRequest is defined, overrideSendResponse is undefined, and processRequest returns a truthy value, override response.send
    if (overrideSendResponse || (typeof overrideSendResponse === 'undefined' && processRequest)) {
      const finished = new Promise((resolve) => request.on('end', resolve));
      const { send } = response;
      // Todo: Find a less hacky way to prevent sending a response before the request has ended.
      // TODO: add tests
      response.send = (...args): any => {
        finished.then(() => {
          response.send = send;
          response.send(...args);
        });
      };
    }

    processRequest(request, response, processRequestOptions)
      .then((body) => {
        request.body = body;
        next();
      })
      .catch((error) => {
        if (error.status && error.expose) response.status(error.status);
        next(error);
      });
  };
}
