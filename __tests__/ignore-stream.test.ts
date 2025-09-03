import { doesNotThrow, strictEqual } from 'assert';
import { ignoreStream } from '../src';
import { CountReadableStream } from './utils/count-readable-stream';

describe('ignoreStream', () => {
  it('`ignoreStream` ignores errors.', () => {
    doesNotThrow(() => {
      const stream = new CountReadableStream({});
      ignoreStream(stream);
      stream.emit('error', new Error('Message.'));
    });
  });

  it('`ignoreStream` resumes a paused stream.', () => {
    const stream = new CountReadableStream({});
    stream.pause();
    ignoreStream(stream);
    strictEqual(stream.isPaused(), false);
  });
});
