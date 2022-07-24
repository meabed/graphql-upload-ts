import { Upload } from '../src';
import { ok, strictEqual } from 'assert';

describe('Upload', () => {
  it('`Upload` class resolving a file.', async () => {
    const upload = new Upload();

    ok(upload.promise instanceof Promise);
    strictEqual(typeof upload.resolve, 'function');

    const file = {} as any;

    upload.resolve(file);

    const resolved = await upload.promise;

    strictEqual(resolved, file);
    strictEqual(upload.file, file);
  });

  it('`Upload` class with a handled rejection.', async () => {
    const upload = new Upload();

    ok(upload.promise instanceof Promise);
    strictEqual(typeof upload.reject, 'function');

    const error = new Error('Message.');

    upload.reject(error);

    await expect(upload.promise).rejects.toEqual(error);
  });

  it('`Upload` class with an unhandled rejection.', async () => {
    const upload = new Upload();

    ok(upload.promise instanceof Promise);
    strictEqual(typeof upload.reject, 'function');

    const error = new Error('Message.');

    upload.reject(error);

    // Rely on the fact that node.js and default mocha behaviour is used.
    // The process won't exit with an error
    // if the unhandled rejection is silenced as intended.
    await new Promise((r) => setTimeout(r, 10));
  });
});
