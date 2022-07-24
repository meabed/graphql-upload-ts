import { processRequest as defaultProcessRequest } from './processRequest';

type ProcessRequestOptions = {
  processRequest?: ((req: any, res: any, options: any) => Promise<any>) | (() => Promise<void>);
  [key: string]: any;
};

export function graphqlUploadKoa(params: ProcessRequestOptions = {}) {
  const { processRequest = defaultProcessRequest, ...processRequestOptions } = params;
  return async function graphqlUploadKoaMiddleware(ctx: any, next: any) {
    if (!ctx.request.is('multipart/form-data')) return next();

    const finished = new Promise((resolve) => ctx.req.on('end', resolve));

    try {
      ctx.request.body = await processRequest(ctx.req, ctx.res, processRequestOptions);
      await next();
    } finally {
      await finished;
    }
  };
}
