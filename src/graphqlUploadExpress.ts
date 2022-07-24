import { processRequest as defaultProcessRequest } from './processRequest';

export type ProcessRequestOptions = {
  processRequest?: ((req: any, res: any, options: any) => Promise<any>) | (() => Promise<void>);
  [key: string]: any;
};

export function graphqlUploadExpress(params: ProcessRequestOptions = {}) {
  const { processRequest = defaultProcessRequest, ...processRequestOptions } = params;
  return function graphqlUploadExpressMiddleware(request: any, response: any, next: any) {
    if (!request.is('multipart/form-data')) return next();

    const finished = new Promise((resolve) => request.on('end', resolve));
    const { send } = response;

    response.send = (...args: any) => {
      finished.then(() => {
        response.send = send;
        response.send(...args);
      });
    };

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
