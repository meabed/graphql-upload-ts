export class Deferred {
  promise: Promise<any>;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;

  constructor() {
    /** The promise. */
    this.promise = new Promise((resolve, reject) => {
      /** Resolves the promise. */
      this.resolve = resolve;

      /** Rejects the promise. */
      this.reject = reject;
    });
  }
}
