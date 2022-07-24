const errorNames = {
  400: 'BadRequestError',
  413: 'PayloadTooLargeError',
  499: 'BadRequestError',
  500: 'InternalError',
};

export class HttpError extends Error {
  status: string | number;
  expose: boolean;

  constructor(status: string | number, message: string) {
    super(message);
    this.status = status;
    this.expose = true;
    this.name = errorNames[status];
  }
}
