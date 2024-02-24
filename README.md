# graphql upload typescript (graphql-upload-ts)

[![NPM version](https://badgen.net/npm/v/graphql-upload-ts)](https://npm.im/graphql-upload-ts)
[![Build Status](https://github.com/meabed/graphql-upload-ts/workflows/CI/badge.svg)](https://github.com/meabed/graphql-upload-ts/actions)
[![Downloads](https://img.shields.io/npm/dm/graphql-upload-ts.svg)](https://www.npmjs.com/package/graphql-upload-ts)
[![UNPKG](https://img.shields.io/badge/UNPKG-OK-179BD7.svg)](https://unpkg.com/browse/graphql-upload-ts@latest/)

Minimalistic and developer friendly middleware and an [`Upload` scalar](#class-graphqlupload) to add support for [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec) (file uploads via queries and
mutations) to various Node.js GraphQL servers.

#### Acknowledgements

This module was forked from the amazing [`graphql-upload-minimal`](https://npm.im/graphql-upload-minimal). The original module is exceptionally well documented and well written. It was very easy to fork and amend.

I needed to support typescript to use it properly in typescript projects.

#### This project is written in typescript

- TypeScript support.
- And using a bit less memory.
- And a bit faster.
- More Examples and documentation


#### Does not follow strict [specification](https://github.com/jaydenseric/graphql-multipart-request-spec)

You can't have same file referenced twice in a GraphQL query/mutation.

## Support

The following environments are known to be compatible:

- [Node.js](https://nodejs.org) versions 12, 14, 16, and 18. It works in Node 10 even though the unit tests fail.
- [Koa](https://koajs.com)
- [Express.js](https://expressjs.com)

See also [GraphQL multipart request spec server implementations](https://github.com/jaydenseric/graphql-multipart-request-spec#server).

## Setup

To install [`graphql-upload-ts`](https://npm.im/graphql-upload-ts) and the [`graphql`](https://npm.im/graphql) peer dependency from [npm](https://npmjs.com) run:

```shell
npm install graphql-upload-ts graphql
# or
yarn add graphql-upload-ts graphql
```

Use the [`graphqlUploadKoa`](#function-graphqluploadkoa) or [`graphqlUploadExpress`](#function-graphqluploadexpress) middleware just before GraphQL middleware. Alternatively, use [`processRequest`](#function-processrequest) to create a
custom middleware.

A schema built with separate SDL and resolvers (e.g. using [`makeExecutableSchema`](https://apollographql.com/docs/graphql-tools/generate-schema#makeExecutableSchema)) requires the [`Upload` scalar](#class-graphqlupload) to be setup.

## Usage

[Clients implementing the GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec#client) upload files as [`Upload` scalar](#class-graphqlupload) query or mutation variables. Their resolver values are
promises that resolve [file upload details](#type-fileupload) for processing and storage. Files are typically streamed into cloud storage but may also be stored in the filesystem.

### Express.js

Minimalistic code example showing how to upload a file along with arbitrary GraphQL data and save it to an S3 bucket.

Express.js middleware. You must put it before the main GraphQL sever middleware. Also, **make sure there is no other Express.js middleware which parses `multipart/form-data`** HTTP requests before the `graphqlUploadExpress` middleware!

```js
const express = require('express');
const expressGraphql = require('express-graphql');
const { graphqlUploadExpress } = require('graphql-upload-ts');

express()
  .use(
    '/graphql',
    graphqlUploadExpress({ 
      maxFileSize: 10000000,
      maxFiles: 10,
      // If you are using framework around express like [ NestJS or Apollo Serve ]
      // use this options overrideSendResponse to allow nestjs to handle response errors like throwing exceptions
      overrideSendResponse: false 
    }),
    expressGraphql({ schema: require('./my-schema') })
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

### Koa

See the [example Koa server and client](https://github.com/jaydenseric/apollo-upload-examples).


### Uploading multiple files

When uploading multiple files you can make use of the `fieldName` property to keep track of an identifier of the uploaded files. The fieldName is equal to the passed `name` property of the file in the `multipart/form-data` request. This can
be modified to contain an identifier (like a UUID), for example using the `formDataAppendFile` in the commonly used [`apollo-upload-link`](https://github.com/jaydenseric/apollo-upload-client#function-formdataappendfile) library.

GraphQL schema:

```graphql
scalar Upload
input DocumentUploadInput {
  docType: String!
  files: [Upload!]
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
          // fieldName contains the "name" property from the multipart/form-data request.
          // Use it to pass an identifier in order to store the file in a consistent manner.
          const { createReadStream, filename, fieldName /*, mimetype, encoding */ } = await doc.file;
          const Key = `${ctx.user.id}/${doc.docType}-${fieldName}`;
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

## Tips
- If you are using framework around express like [ NestJS or Apollo Serve ] use the option `overrideSendResponse` eg: `graphqlUploadExpress({ overrideSendResponse: false })` to allow nestjs to handle response errors like throwing exceptions.

## Architecture

The [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec) allows a file to be used for multiple query or mutation variables (file deduplication), and for variables to be used in multiple places.
GraphQL's resolvers need to be able to manage independent file streams.

[`busboy`](https://npm.im/busboy) parses multipart request streams. Once the `operations` and `map` fields have been parsed, [`Upload` scalar](#class-graphqlupload) values in the GraphQL operations are populated with promises, and the
operations are passed down the middleware chain to GraphQL resolvers.
