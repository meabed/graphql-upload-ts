# graphql upload typescript (graphql-upload-ts)

[![NPM version](https://badgen.net/npm/v/graphql-upload-ts)](https://npm.im/graphql-upload-ts)
[![Build Status](https://github.com/meabed/graphql-upload-ts/workflows/CI/badge.svg)](https://github.com/meabed/graphql-upload-ts/actions)
[![Downloads](https://img.shields.io/npm/dm/graphql-upload-ts.svg)](https://www.npmjs.com/package/graphql-upload-ts)
[![UNPKG](https://img.shields.io/badge/UNPKG-OK-179BD7.svg)](https://unpkg.com/browse/graphql-upload-ts@latest/)

Minimalistic and developer friendly middleware and an [`Upload` scalar](#class-graphqlupload) to add support for [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec) (file uploads via queries and
mutations) to various Node.js GraphQL servers.

#### Acknowledgements

This module was forked from [`graphql-upload`](https://npm.im/graphql-upload) and [`graphql-upload-minimal`](https://npm.im/graphql-upload-minimal). The original module is exceptionally well documented and well written. It was very easy to fork and amend.

I needed to support typescript to use it properly in typescript projects.

### Examples
- Apollo Server & Express: [Apollo Server example](./examples/apollo)
- Express & Graphql Http: [Express example](./examples/express/graphql-http.ts)
- Express & Yoga: [Express example](./examples/express/graphql-yoga.ts)

### Setup

To install [`graphql-upload-ts`](https://npm.im/graphql-upload-ts) and the [`graphql`](https://npm.im/graphql) peer dependency from [npm](https://npmjs.com) run:

```shell
npm install graphql-upload-ts graphql
# or
yarn add graphql-upload-ts graphql
```

Use the [`graphqlUploadKoa`](#function-graphqluploadkoa) or [`graphqlUploadExpress`](#function-graphqluploadexpress) middleware just before GraphQL middleware. Alternatively, use [`processRequest`](#function-processrequest) to create a
custom middleware.

A schema built with separate SDL and resolvers (e.g. using [`makeExecutableSchema`](https://apollographql.com/docs/graphql-tools/generate-schema#makeExecutableSchema)) requires the [`Upload` scalar](#class-graphqlupload) to be setup.

### Usage

[Clients implementing the GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec#client) upload files as [`Upload` scalar](#class-graphqlupload) query or mutation variables. Their resolver values are
promises that resolve [file upload details](#type-fileupload) for processing and storage. Files are typically streamed into cloud storage but may also be stored in the filesystem.


#### Express.js

Minimalistic code example showing how to upload a file along with arbitrary GraphQL data and save it to an S3 bucket.

Express.js middleware. You must put it before the main GraphQL sever middleware. Also, **make sure there is no other Express.js middleware which parses `multipart/form-data`** HTTP requests before the `graphqlUploadExpress` middleware!

```ts
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { graphqlUploadExpress } from 'graphql-upload-ts';

express()
  .use(
    '/graphql',
    graphqlUploadExpress({ 
      maxFileSize: 10000000,
      maxFiles: 10,
    }),
    graphqlHTTP({ schema: require('./my-schema') })
  )
  .listen(3000);
```

GraphQL schema:

```graphql
scalar Upload
input DocumentUploadInput {
  docType: String!
  file: Upload!
}

type SuccessResult {
  success: Boolean!
  message: String
}
type Mutations {
  uploadDocuments(docs: [DocumentUploadInput!]!): SuccessResult
}
```

GraphQL resolvers:

```js
const { S3 } = require('aws-sdk');

const resolvers = {
  Upload: require('graphql-upload-ts').GraphQLUpload,

  Mutations: {
    async uploadDocuments(root, { docs }, ctx) {
      try {
        const s3 = new S3({ apiVersion: '2006-03-01', params: { Bucket: 'my-bucket' } });

        for (const doc of docs) {
          const { createReadStream, filename /*, fieldName, mimetype, encoding */ } = await doc.file;
          const Key = `${ctx.user.id}/${doc.docType}-${filename}`;
          await s3.upload({ Key, Body: createReadStream() }).promise();
        }

        return { success: true };
      } catch (error) {
        console.log('File upload failed', error);
        return { success: false, message: error.message };
      }
    },
  },
};
```


#### Tips
- The process must have both read and write access to the directory identified by [`os.tmpdir()`](https://nodejs.org/api/os.html#ostmpdir).
- The device requires sufficient disk space to buffer the expected number of concurrent upload requests.
- Promisify and await file upload streams in resolvers or the server will send a response to the client before uploads are complete, causing a disconnect.
- Handle file upload promise rejection and stream errors; uploads sometimes fail due to network connectivity issues or impatient users disconnecting.
- Process multiple uploads asynchronously with [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) or a more flexible solution such as [`Promise.allSettled`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) where an error in one does not reject them all.
- Only use the function `createReadStream` _before_ the resolver returns; late calls (e.g. in an unawaited async function or callback) throw an error. Existing streams can still be used after a response is sent, although there are few valid reasons for not awaiting their completion.
- Use [`stream.destroy()`](https://nodejs.org/api/stream.html#readabledestroyerror) when an incomplete stream is no longer needed, or temporary files may not get cleaned up.
- If you are using framework around express like [ NestJS or Apollo Serve ] use the option `overrideSendResponse` eg: `graphqlUploadExpress({ overrideSendResponse: false })` to allow nestjs to handle response errors like throwing exceptions.

#### Architecture

The [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec) allows a file to be used for multiple query or mutation variables (file deduplication), and for variables to be used in multiple places. GraphQL resolvers need to be able to manage independent file streams. As resolvers are executed asynchronously, it’s possible they will try to process files in a different order than received in the multipart request.

[`busboy`](https://npm.im/busboy) parses multipart request streams. Once the `operations` and `map` fields have been parsed, [`Upload`](./src/GraphQLUpload.ts) scalar values in the GraphQL operations are populated with promises, and the operations are passed down the middleware chain to GraphQL resolvers.

[`fs-capacitor`](https://npm.im/fs-capacitor) is used to buffer file uploads to the filesystem and coordinate simultaneous reading and writing. As soon as a file upload’s contents begins streaming, its data begins buffering to the filesystem and its associated promise resolves. GraphQL resolvers can then create new streams from the buffer by calling the function `createReadStream`. The buffer is destroyed once all streams have ended or closed and the server has responded to the request. Any remaining buffer files will be cleaned when the process exits.



[`busboy`](https://npm.im/busboy) parses multipart request streams. Once the `operations` and `map` fields have been parsed, [`Upload` scalar](#class-graphqlupload) values in the GraphQL operations are populated with promises, and the
operations are passed down the middleware chain to GraphQL resolvers.


#### Support

The following environments are known to be compatible:

- [Node.js](https://nodejs.org) >= 16
- [Koa](https://koajs.com)
- [Express.js](https://expressjs.com)

See also [GraphQL multipart request spec server implementations](https://github.com/jaydenseric/graphql-multipart-request-spec#server).
