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
      .use(graphqlUploadExpress({ overrideSendResponse: true }))
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

  it('`graphqlUploadExpress` with response sent after request completes.', async () => {
    let requestProcessed = false;
    let responseData: unknown;

    const app = express()
      .use(graphqlUploadExpress())
      // @ts-expect-error - Unused parameter
      .use((request, response) => {
        requestProcessed = true;
        // Simulate async operation that sends response after request is complete
        setTimeout(() => {
          response.json({ success: true });
        }, 100);
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();
      body.append('operations', JSON.stringify({ query: '{ test }' }));
      body.append('map', JSON.stringify({}));

      const response = await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              res.responseData = data;
              resolve(res);
            });
          }
        });
      });

      responseData = JSON.parse(response.responseData || '{}');
      ok(requestProcessed);
      deepStrictEqual(responseData, { success: true });
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with synchronous response after request completes.', async () => {
    let requestBody: CtxRequestBody;

    const app = express()
      .use(graphqlUploadExpress())
      .use((request, response) => {
        requestBody = request.body;
        // Send response immediately (synchronously)
        // This tests the path where requestFinished is already true
        response.json({
          processed: true,
          fileReceived: !!requestBody?.variables?.file,
        });
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();
      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'test content', { filename: 'test.txt' });

      const response = await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              res.responseData = data;
              resolve(res);
            });
          }
        });
      });

      const responseData = JSON.parse(response.responseData || '{}');
      ok(requestBody);
      ok(requestBody.variables);
      ok(requestBody.variables.file);
      deepStrictEqual(responseData, { processed: true, fileReceived: true });
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with overrideSendResponse false.', async () => {
    let requestProcessed = false;
    let originalSendCalled = false;

    const app = express()
      .use(graphqlUploadExpress({ overrideSendResponse: false }))
      .use((_request, response) => {
        requestProcessed = true;
        const originalSend = response.send;
        response.send = function (...args) {
          originalSendCalled = true;
          return originalSend.apply(this, args);
        };
        response.json({ success: true });
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();
      body.append('operations', JSON.stringify({ query: '{ test }' }));
      body.append('map', JSON.stringify({}));

      await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              res.responseData = data;
              resolve(res);
            });
          }
        });
      });

      ok(requestProcessed);
      ok(originalSendCalled);
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with overrideSendResponse true and request already finished.', async () => {
    let requestBody: CtxRequestBody;
    let sendCalledImmediately = false;

    const app = express()
      .use(graphqlUploadExpress({ overrideSendResponse: true }))
      .use((request, response) => {
        requestBody = request.body;
        // By the time we send response, request should be finished
        // This tests the else branch at lines 94-95
        process.nextTick(() => {
          response.json({
            processed: true,
            fileReceived: !!requestBody?.variables?.file,
          });
          sendCalledImmediately = true;
        });
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();
      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'test content', { filename: 'test.txt' });

      const response = await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              res.responseData = data;
              resolve(res);
            });
          }
        });
      });

      const responseData = JSON.parse(response.responseData || '{}');
      ok(requestBody);
      ok(sendCalledImmediately);
      deepStrictEqual(responseData, { processed: true, fileReceived: true });
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with custom processRequest defaults overrideSendResponse to true.', async () => {
    let customProcessRequestCalled = false;
    let requestBody: CtxRequestBody;

    const app = express()
      .use(
        graphqlUploadExpress({
          async processRequest(request, response, options) {
            customProcessRequestCalled = true;
            return processRequest(request, response, options);
          },
        })
      )
      .use((request, response) => {
        requestBody = request.body;
        response.json({ customProcessor: true });
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();
      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'test', { filename: 'test.txt' });

      const response = await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              res.responseData = data;
              resolve(res);
            });
          }
        });
      });

      const responseData = JSON.parse(response.responseData || '{}');
      ok(customProcessRequestCalled);
      ok(requestBody);
      deepStrictEqual(responseData, { customProcessor: true });
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with processRequest throwing non-exposed HTTP error.', async () => {
    let expressError: unknown;
    let responseStatusCode: unknown;

    const error = createHttpError(500, 'Internal Server Error');
    error.expose = false; // This error should not set the response status

    const app = express()
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
      // When expose is false, the status should not be set
      strictEqual(responseStatusCode, 200);
    } finally {
      close();
    }
  });

  it('`graphqlUploadExpress` with overrideSendResponse true and response.send called after request ends (lines 94-95).', async () => {
    let requestBody: CtxRequestBody;
    let sendWasOverridden = false;
    let sendCalledAfterEnd = false;
    let sendRestoredAndCalled = false;

    const app = express()
      .use(graphqlUploadExpress({ overrideSendResponse: true }))
      .use((request, response) => {
        requestBody = request.body;

        // Check if send was overridden by the middleware
        const overriddenSend = response.send;
        sendWasOverridden = typeof overriddenSend === 'function' && overriddenSend.name !== 'send';

        // Wait for the request to fully end
        request.on('end', () => {
          // Now call response.send after request has ended
          // This specifically triggers lines 94-95 where it restores the original send
          setTimeout(() => {
            sendCalledAfterEnd = true;
            // Call response.send/json which should trigger the restoration
            response.json({ requestEnded: true });
            // The send should have been called successfully
            sendRestoredAndCalled = true;
          }, 10);
        });
      });

    const { port, close } = await listen(createServer(app));

    try {
      const body = new FormData();
      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'test', { filename: 'test.txt' });

      const response = await new Promise<ResIncomingMessage>((resolve, reject) => {
        body.submit(`http://localhost:${port}`, (err, res: ResIncomingMessage) => {
          if (err) reject(err);
          else {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              res.responseData = data;
              // Wait a bit to ensure the setTimeout in the handler runs
              setTimeout(() => resolve(res), 50);
            });
          }
        });
      });

      const responseData = JSON.parse(response.responseData || '{}');
      ok(requestBody, 'Request body should be processed');
      ok(sendWasOverridden, 'Send should be overridden by middleware');
      ok(sendCalledAfterEnd, 'Send should be called after request ended');
      ok(sendRestoredAndCalled, 'Send should be restored and called successfully (lines 94-95)');
      deepStrictEqual(responseData, { requestEnded: true });
    } finally {
      close();
    }
  });
});
