import type { Readable } from 'node:stream';

/**
 * Converts a Node.js readable stream to a string.
 * @kind function
 * @name streamToString
 * @param {ReadableStream} stream Node.js readable stream.
 * @returns {Promise<string>} Resolves the final string.
 * @ignore
 */
export function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    stream
      .on('error', reject)
      .on('data', (chunk) => {
        data += chunk;
      })
      .on('end', () => resolve(data));
  });
}
