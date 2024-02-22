import { Readable } from 'stream';

/**
 * Safely ignores a Node.js readable stream.
 * @kind function
 * @name ignoreStream
 * @param {ReadableStream} stream Node.js readable stream.
 * @private
 * @ignore
 */
export function ignoreStream(stream: Readable) {
  // Prevent an unhandled error from crashing the process.
  stream.on('error', () => {});

  // Waste the stream.
  stream.resume();
}
