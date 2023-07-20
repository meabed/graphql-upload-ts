import { graphqlUploadKoa } from '../src';
import { processRequest } from '../src';
import { listen } from './utils/listen';
import { deepStrictEqual, ok, strictEqual } from 'assert';
import FormData from 'form-data';
import Koa from 'koa';
import fetch from 'node-fetch';

describe('graphqlUploadKoa', () => {
  it('`graphqlUploadKoa` with a non multipart request.', async () => {
    let processRequestRan = false;

    const app = new Koa().use(
      graphqlUploadKoa({
        async processRequest() {
          processRequestRan = true;
        },
      }),
    );

    const { port, close } = await listen(app);

    try {
      await fetch(`http://localhost:${port}`, { method: 'POST' });
      strictEqual(processRequestRan, false);
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request.', async () => {
    let ctxRequestBody;

    const app = new Koa().use(graphqlUploadKoa()).use(async (ctx, next) => {
      ctxRequestBody = ctx.request.body;
      await next();
    });

    const { port, close } = await listen(app);

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await fetch(`http://localhost:${port}`, { method: 'POST', body });

      ok(ctxRequestBody);
      ok(ctxRequestBody.variables);
      ok(ctxRequestBody.variables.file);
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request and option `processRequest`.', async () => {
    let processRequestRan = false;
    let ctxRequestBody;

    const app = new Koa()
      .use(
        graphqlUploadKoa({
          processRequest(...args) {
            processRequestRan = true;
            return processRequest(...args);
          },
        }),
      )
      .use(async (ctx, next) => {
        ctxRequestBody = ctx.request.body;
        await next();
      });

    const { port, close } = await listen(app);

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await fetch(`http://localhost:${port}`, { method: 'POST', body });

      strictEqual(processRequestRan, true);
      ok(ctxRequestBody);
      ok(ctxRequestBody.variables);
      ok(ctxRequestBody.variables.file);
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request and option `processRequest` throwing an error.', async () => {
    let koaError;
    let requestCompleted;

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
        }),
      );

    const { port, close } = await listen(app);

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await fetch(`http://localhost:${port}`, { method: 'POST', body });

      deepStrictEqual(koaError, error);
      ok(requestCompleted, "Response wasn't delayed until the request completed.");
    } finally {
      close();
    }
  });

  it('`graphqlUploadKoa` with a multipart request and following middleware throwing an error.', async () => {
    let koaError;
    let requestCompleted;

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

    const { port, close } = await listen(app);

    try {
      const body = new FormData();

      body.append('operations', JSON.stringify({ variables: { file: null } }));
      body.append('map', JSON.stringify({ 1: ['variables.file'] }));
      body.append('1', 'a', { filename: 'a.txt' });

      await fetch(`http://localhost:${port}`, { method: 'POST', body });

      deepStrictEqual(koaError, error);
      ok(requestCompleted, "Response wasn't delayed until the request completed.");
    } finally {
      close();
    }
  });
});
