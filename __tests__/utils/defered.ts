export class Deferred {
  promise: Promise<unknown>;
  resolve!: (value?: unknown) => void;
  reject!: (reason?: unknown) => void;

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
