import { deepStrictEqual, ok, strictEqual } from 'node:assert';
// Node.js 18+ has native fetch
import { createServer, type IncomingMessage } from 'node:http';
import type { Response } from 'express';
import express, { type NextFunction } from 'express';
import FormData from 'form-data';
import createHttpError from 'http-errors';
import { graphqlUploadExpress, processRequest } from '../src';
import { listen } from './utils/listen';

type CtxRequestBody =
  | {
      variables?: {
        file?: unknown;
      };
    }
  | undefined;

interface ResIncomingMessage extends IncomingMessage {
  complete: boolean;
  responseData?: string;
}

describe('graphqlUploadExpress', () => {
  it('`graphqlUploadExpress` with a non multipart request.', async () => {
    let processRequestRan = false;

    const app = express().use(
      graphqlUploadExpress({
        async processRequest<T>() {
          processRequestRan = true;
          return {} as T;
        },
      })
    );

    const { port, close } = await listen(createServer(app));

    try {
      await fetch(`http://localhost:${port}`, { method: 'POST' });
      strictEqual(processRequestRan, false);
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with a multipart request.', async () => {
    let requestBody: CtxRequestBody;

    const app = express()
      .use(graphqlUploadExpress())
      .use((request, _response, next) => {
        requestBody = request.body;
        next();
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            // Wait for response to complete
            let responseData = '';
            res.on('data', (chunk) => (responseData += chunk));
            res.on('end', () => {
              res.responseData = responseData;
              resolve(res);
            });
          }
        });
      });

      ok(requestBody);
      ok(requestBody.variables);
      ok(requestBody.variables.file);
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with a multipart request and option `processRequest`.', async () => {
    let processRequestRan = false;
    let requestBody: CtxRequestBody;

    const app = express()
      .use(
        graphqlUploadExpress({
          processRequest(...args) {
            processRequestRan = true;
            return processRequest(...args);
          },
        })
      )
      .use((request, _response, next) => {
        requestBody = request.body;
        next();
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            // Wait for response to complete
            let responseData = '';
            res.on('data', (chunk) => (responseData += chunk));
            res.on('end', () => {
              res.responseData = responseData;
              resolve(res);
            });
          }
        });
      });

      strictEqual(processRequestRan, true);
      ok(requestBody);
      ok(requestBody.variables);
      ok(requestBody.variables.file);
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with a multipart request and option `processRequest` throwing an exposed HTTP error.', async () => {
    let expressError: unknown;
    let requestCompleted: unknown;
    let responseStatusCode: unknown;

    const error = createHttpError(400, 'Message.');
    const app = express()
      .use((request, response, next) => {
        const { send } = response;

        // @ts-expect-error
        response.send = (...args: []) => {
          requestCompleted = request.complete;
          response.send = send;
          response.send(...args);
        };

        next();
      })
      .use(
        graphqlUploadExpress({
          async processRequest(request) {
            request.resume();
            throw error;
          },
        })
      )
      .use((error: unknown, _request: unknown, response: Response, next: NextFunction) => {
        expressError = error;
        responseStatusCode = response.statusCode;

        // Sending a response here prevents the default Express error handler
        // from running, which would undesirably (in this case) display the
        // error in the console.
        if (response.headersSent) next(error);
        else response.send();
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            // Wait for response to complete
            let responseData = '';
            res.on('data', (chunk) => (responseData += chunk));
            res.on('end', () => {
              res.responseData = responseData;
              resolve(res);
            });
          }
        });
      });

      deepStrictEqual(expressError, error);
      ok(requestCompleted, "Response wasn't delayed until the request completed.");
      strictEqual(responseStatusCode, error.status);
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with a multipart request following middleware throwing an error.', async () => {
    let expressError: unknown;
    let requestCompleted: unknown;

    const error = new Error('Message.');
    const app = express()
      .use((request, response, next) => {
        const { send } = response;

        // @ts-expect-error
        response.send = (...args: []) => {
          requestCompleted = request.complete;
          response.send = send;
          response.send(...args);
        };

        next();
      })
      .use(graphqlUploadExpress())
      .use(() => {
        throw error;
      })
      .use((error: unknown, _request: unknown, response: Response, next: NextFunction) => {
        expressError = error;

        // Sending a response here prevents the default Express error handler
        // from running, which would undesirably (in this case) display the
        // error in the console.
        if (response.headersSent) next(error);
        else response.send();
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            // Wait for response to complete
            let responseData = '';
            res.on('data', (chunk) => (responseData += chunk));
            res.on('end', () => {
              res.responseData = responseData;
              resolve(res);
            });
          }
        });
      });

      deepStrictEqual(expressError, error);
      ok(requestCompleted, "Response wasn't delayed until the request completed.");
    } finally {
      close();
    }
  });
});
