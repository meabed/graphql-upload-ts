import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import type { IncomingMessage } from 'node:http';
// Node.js 18+ has native fetch
import { createServer } from 'node:http';
import FormData from 'form-data';
import Koa from 'koa';
import { graphqlUploadKoa, processRequest } from '../src';
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

describe('graphqlUploadKoa', () => {
  it('`graphqlUploadKoa` with a non multipart request.', async () => {
    let processRequestRan = false;

    const app = new Koa().use(
      graphqlUploadKoa({
        // @ts-ignore
        async processRequest() {
          processRequestRan = true;
          return {};
        },
      })
    );

    const { port, close } = await listen(createServer(app.callback()));

    try {
      await fetch(`http://localhost:${port}`, { method: 'POST' });
      strictEqual(processRequestRan, false);
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request.', async () => {
    let ctxRequestBody: CtxRequestBody;
    let errorCaught: Error | unknown;

    const app = new Koa()
      .use(async (ctx, next) => {
        try {
          await next();
        } catch (error) {
          errorCaught = error;
          ctx.status = 500;
        }
      })
      .use(graphqlUploadKoa())
      .use(async (ctx, next) => {
        ctxRequestBody = ctx.body;
        ctx.status = 200;
        await next();
      });

    const { port, close } = await listen(createServer(app.callback()));

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      const response = await new Promise<ResIncomingMessage>((resolve, reject) => {
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

      if (errorCaught) {
        console.error('Error caught:', errorCaught);
      }

      ok(ctxRequestBody, `ctxRequestBody is undefined, response status: ${response.statusCode}`);
      ok(ctxRequestBody.variables);
      ok(ctxRequestBody.variables.file);
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request and option `processRequest`.', async () => {
    let processRequestRan = false;
    let ctxRequestBody: CtxRequestBody;

    const app = new Koa()
      .use(
        graphqlUploadKoa({
          processRequest(...args) {
            processRequestRan = true;
            return processRequest(...args);
          },
        })
      )
      .use(async (ctx, next) => {
        ctxRequestBody = ctx.body;
        await next();
      });

    const { port, close } = await listen(createServer(app.callback()));

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
      ok(ctxRequestBody);
      ok(ctxRequestBody.variables);
      ok(ctxRequestBody.variables.file);
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request and option `processRequest` throwing an error.', async () => {
    let koaError: unknown;
    let requestCompleted = false;

    const error = new Error('Message.');
    const app = new Koa()
      .on('error', (error) => {
        koaError = error;
      })
      .use(async (ctx, next) => {
        try {
          await next();
        } finally {
          requestCompleted = ctx.req.complete;
        }
      })
      .use(
        graphqlUploadKoa({
          async processRequest(request) {
            request.resume();
            throw error;
          },
        })
      );

    const { port, close } = await listen(createServer(app.callback()));

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

      deepStrictEqual(koaError, error);
      ok(requestCompleted, "Response wasn't delayed until the request completed.");
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request and following middleware throwing an error.', async () => {
    let koaError: unknown;
    let requestCompleted = false;

    const error = new Error('Message.');
    const app = new Koa()
      .on('error', (error) => {
        koaError = error;
      })
      .use(async (ctx, next) => {
        try {
          await next();
        } finally {
          requestCompleted = ctx.req.complete;
        }
      })
      .use(graphqlUploadKoa())
      .use(async () => {
        throw error;
      });

    const { port, close } = await listen(createServer(app.callback()));

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

      deepStrictEqual(koaError, error);
      ok(requestCompleted, "Response wasn't delayed until the request completed.");
    } finally {
      close();
    }
  });
});
