import { ReadStream, ReadStreamOptions, WriteStream } from './fs-capacitor';

export interface FileUpload {
  filename: string;
  fieldName: string;
  mimetype: string;
  encoding: string;
  createReadStream(options?: ReadStreamOptions): ReadStream;
  capacitor: WriteStream;
}

export class Upload {
  promise: Promise<FileUpload>;
  resolve: (file?: FileUpload) => void;
  reject: (error?: Error | string) => void;
  file?: FileUpload;

  constructor() {
    /**
     * Promise that resolves file upload details. This should only be utilized
     * by {@linkcode GraphQLUpload}.
     * @type {Promise<import("./processRequest.mjs").FileUpload>}
     */
    this.promise = new Promise((resolve, reject) => {
      /**
       * Resolves the upload promise with the file upload details. This should
       * only be utilized by {@linkcode processRequest}.
       * @param {import("./processRequest.mjs").FileUpload} file File upload
       *   details.
       */
      this.resolve = (file) => {
        /**
         * The file upload details, available when the
         * {@linkcode Upload.promise} resolves. This should only be utilized by
         * {@linkcode processRequest}.
         * @type {import("./processRequest.mjs").FileUpload | undefined}
         */
        this.file = file;

        resolve(file);
      };

      /**
       * Rejects the upload promise with an error. This should only be
       * utilized by {@linkcode processRequest}.
       * @param {Error} error Error instance.
       */
      this.reject = reject;
    });

    // Prevent errors crashing Node.js, see:
    // https://github.com/nodejs/node/issues/20392
    this.promise.catch(() => {});
  }
}
