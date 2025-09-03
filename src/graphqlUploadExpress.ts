import type { NextFunction, Request, Response } from 'express';
import type { HttpError } from 'http-errors';
import {
  type GraphQLOperation,
  type IncomingReq,
  type UploadOptions,
  processRequest as defaultProcessRequest,
} from './processRequest';

type ProcessRequestFn = <T = GraphQLOperation | GraphQLOperation[]>(
  req: IncomingReq,
  res: Pick<Response, 'once'>,
  options?: UploadOptions
) => Promise<T>;

export interface GraphqlUploadExpressOptions extends UploadOptions {
  processRequest?: ProcessRequestFn;
  overrideSendResponse?: boolean;
}

/**
 * Creates Express middleware for handling GraphQL multipart requests (file uploads).
 * This middleware processes multipart/form-data requests and converts them into a format
 * that GraphQL servers can understand.
 *
 * @example Basic setup with Apollo Server
 * ```typescript
 * import express from 'express';
 * import { graphqlUploadExpress } from 'graphql-upload-ts';
 * import { ApolloServer } from '@apollo/server';
 *
 * const app = express();
 *
 * app.use(
 *   '/graphql',
 *   graphqlUploadExpress({
 *     maxFileSize: 10_000_000, // 10MB
 *     maxFiles: 10
 *   })
 * );
 *
 * // Apollo Server setup continues...
 * ```
 */
export function graphqlUploadExpress(
  options: GraphqlUploadExpressOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    processRequest = defaultProcessRequest,
    overrideSendResponse = false,
    ...uploadOptions
  } = options;

  return function graphqlUploadExpressMiddleware(
    request: Request,
    response: Response,
    next: NextFunction
  ): void {
    if (!request.is('multipart/form-data')) {
      return next();
    }

    // Store the original send method
    const originalSend = response.send.bind(response);
    let requestFinished = false;

    // Monitor when the request is complete
    request.on('end', () => {
      requestFinished = true;
    });

    // Override send to ensure request is complete before sending response
    response.send = (...args: Parameters<typeof response.send>): typeof response => {
      if (!requestFinished) {
        // If request isn't finished, wait for it
        request.on('end', () => {
          response.send = originalSend;
          originalSend(...args);
        });
      } else {
        // Request is already finished, send immediately
        response.send = originalSend;
        originalSend(...args);
      }
      return response;
    };

    processRequest(request as IncomingReq, response, uploadOptions)
      .then((body) => {
        request.body = body;
        next();
      })
      .catch((error: HttpError | Error) => {
        if ('status' in error && 'expose' in error && error.expose) {
          response.status(error.status);
        }
        next(error);
      });
  };
}
