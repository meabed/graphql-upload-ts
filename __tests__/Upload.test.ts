import { ok, strictEqual } from 'assert';
import { type FileUpload, Upload, WriteStream } from '../src';

describe('Upload', () => {
  it('`Upload` class resolving a file.', async () => {
    const upload = new Upload();

    ok(upload.promise instanceof Promise);
    strictEqual(typeof upload.resolve, 'function');

    const file: FileUpload = {
      filename: 'test.txt',
      fieldName: 'file',
      mimetype: 'text/plain',
      encoding: 'utf-8',
      capacitor: new WriteStream(),
      createReadStream: () => file.capacitor.createReadStream(),
    };

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

    // Rely on the fact that node.js and Jest handle unhandled rejections properly.
    // The process won't exit with an error
    // if the unhandled rejection is silenced as intended.
    await new Promise((r) => setTimeout(r, 10));
  });
});
