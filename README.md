# graphql-upload-minimal

[![npm version](https://badgen.net/npm/v/graphql-upload-minimal)](https://npm.im/graphql-upload-minimal) [![CI status](https://github.com/flash-oss/graphql-upload-minimal/workflows/CI/badge.svg)](https://github.com/flash-oss/graphql-upload-minimal/actions)

Minimalistic and developer friendly middleware and an [`Upload` scalar](#class-graphqlupload) to add support for [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec) (file uploads via queries and mutations) to various Node.js GraphQL servers.

## Acknowledgements

This module was ⚠️ forked from the amazing [`graphql-upload`](https://npm.im/graphql-upload). The original module is exceptionally well documented and well written. It was very easy to fork and amend. Thanks Jayden!

I needed something simpler which won't attempt doing any disk I/O. There were no server-side JavaScript alternative modules for GraphQL file uploads. Thus, this fork was born.

### Differences to [`graphql-upload`](https://npm.im/graphql-upload)

#### Single production dependency - `busboy`

- Results in 9 less production dependencies.
- And 6 less MB in your `node_modules`.
- And using a bit less memory.
- And a bit faster.
- Most importantly, less risk that one of the dependencies would break your server.

#### More standard and developer friendly exception messages

Using ASCII-only text. Direct developers to resolve common mistakes.

#### **Does not create any temporary files on disk**

- Thus works faster.
- Does not have a risk of clogging your file system. Even on high load.
- No need to manually destroy the programmatically aborted streams.

#### Does not follow strict [specification](https://github.com/jaydenseric/graphql-multipart-request-spec)

You can't have same file referenced twice in a GraphQL query/mutation.

#### API changes comparing to the original `graphql-upload`

- Does not accept any arguments to `createReadStream()`. Will **throw** if any provided.
- Calling `createReadStream()` more than once per file is not allowed. Will **throw**.

Otherwise, **this module is a drop-in replacement for the `graphql-upload`**.

## Support

The following environments are known to be compatible:

- [Node.js](https://nodejs.org) versions 10, 12, 13 and 14. It works in Node 8 even though the unit tests fail.
- [AWS Lambda](https://aws.amazon.com/lambda/). [Reported](https://github.com/flash-oss/graphql-upload-minimal/issues/4#issuecomment-664234726) to be working.
- [Google Cloud Functions (GCF)](https://cloud.google.com/functions) Experimental. Untested.
- [Azure Functions](https://azure.microsoft.com/en-us/services/functions/) Experimental. Untested.
- [Koa](https://koajs.com)
- [Express.js](https://expressjs.com)

See also [GraphQL multipart request spec server implementations](https://github.com/jaydenseric/graphql-multipart-request-spec#server).

## Setup

To install [`graphql-upload-minimal`](https://npm.im/graphql-upload-minimal) and the [`graphql`](https://npm.im/graphql) peer dependency from [npm](https://npmjs.com) run:

```shell
npm install graphql-upload-minimal graphql
```

Use the [`graphqlUploadKoa`](#function-graphqluploadkoa) or [`graphqlUploadExpress`](#function-graphqluploadexpress) middleware just before GraphQL middleware. Alternatively, use [`processRequest`](#function-processrequest) to create a custom middleware.

A schema built with separate SDL and resolvers (e.g. using [`makeExecutableSchema`](https://apollographql.com/docs/graphql-tools/generate-schema#makeExecutableSchema)) requires the [`Upload` scalar](#class-graphqlupload) to be setup.

## Usage

[Clients implementing the GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec#client) upload files as [`Upload` scalar](#class-graphqlupload) query or mutation variables. Their resolver values are promises that resolve [file upload details](#type-fileupload) for processing and storage. Files are typically streamed into cloud storage but may also be stored in the filesystem.

### Express.js

Minimalistic code example showing how to upload a file along with arbitrary GraphQL data and save it to an S3 bucket.

Express.js middleware. You must put it before the main GraphQL sever middleware. Also, **make sure there is no other Express.js middleware which parses `multipart/form-data`** HTTP requests before the `graphqlUploadExpress` middleware!

```js
const express = require("express");
const expressGraphql = require("express-graphql");
const { graphqlUploadExpress } = require("graphql-upload-minimal");

express()
  .use(
    "/graphql",
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
    expressGraphql({ schema: require("./my-schema") })
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
const resolvers = {
  Upload: require("graphql-upload-minimal").GraphQLUpload,

  Mutations: {
    async uploadDocuments(root, { docs }, ctx) {
      try {
        const s3 = new (require("aws-sdk").S3)({ apiVersion: "2006-03-01", params: { Bucket: "my-bucket" } });

        for (const doc of docs) {
          const { createReadStream, filename /*, mimetype, encoding */ } = await doc.file;
          await s3.upload({ Key: `${ctx.user.id}/${doc.docType}-${filename}`, Body: createReadStream() }).promise();
        }

        return { success: true };
      } catch (error) {
        console.log("File upload failed", error);
        return { success: false, message: error.message };
      }
    }
  }
};
```

### Koa

See the [example Koa server and client](https://github.com/jaydenseric/apollo-upload-examples).

### AWS Lambda

[Reported](https://github.com/flash-oss/graphql-upload-minimal/issues/4#issuecomment-664234726) to be working.

```js
const { processRequest } = require("graphql-upload-minimal");

module.exports.processRequest = function (event) {
  return processRequest(event, null, { environment: "lambda" });
};
```

### Google Cloud Functions (GCF)

Possible example. Experimental. Untested.

```js
const { processRequest } = require("graphql-upload-minimal");

exports.uploadFile = function (req, res) {
  return processRequest(req, res, { environment: "gcf" });
};
```

### Azure Functions

Possible example. Experimental. Untested.

```js
const { processRequest } = require("graphql-upload-minimal");

exports.uploadFile = function (context, req) {
  return processRequest(context, req, { environment: "azure" });
};
```

## Tips

- Only use [`createReadStream()`](#type-fileupload) _before_ the resolver returns; late calls (e.g. in an unawaited async function or callback) throw an error.

## Architecture

The [GraphQL multipart request spec](https://github.com/jaydenseric/graphql-multipart-request-spec) allows a file to be used for multiple query or mutation variables (file deduplication), and for variables to be used in multiple places. GraphQL resolvers need to be able to manage independent file streams.

[`busboy`](https://npm.im/busboy) parses multipart request streams. Once the `operations` and `map` fields have been parsed, [`Upload` scalar](#class-graphqlupload) values in the GraphQL operations are populated with promises, and the operations are passed down the middleware chain to GraphQL resolvers.

## API

### Table of contents

- [class GraphQLUpload](#class-graphqlupload)
- [class Upload](#class-upload)
  - [Upload instance method reject](#upload-instance-method-reject)
  - [Upload instance method resolve](#upload-instance-method-resolve)
  - [Upload instance property file](#upload-instance-property-file)
  - [Upload instance property promise](#upload-instance-property-promise)
- [function graphqlUploadExpress](#function-graphqluploadexpress)
- [function graphqlUploadKoa](#function-graphqluploadkoa)
- [function processRequest](#function-processrequest)
- [type FileUpload](#type-fileupload)
- [type FileUploadCreateReadStream](#type-fileuploadcreatereadstream)
- [type GraphQLOperation](#type-graphqloperation)
- [type ProcessRequestFunction](#type-processrequestfunction)
- [type ProcessRequestOptions](#type-processrequestoptions)

### class GraphQLUpload

A GraphQL `Upload` scalar that can be used in a
[`GraphQLSchema`](https://graphql.org/graphql-js/type/#graphqlschema).
It's value in resolvers is a promise that resolves
[file upload details](#type-fileupload) for processing and storage.

#### Examples

_Ways to `import`._

> ```js
> import { GraphQLUpload } from 'graphql-upload-minimal';
> ```
>
> ```js
> import GraphQLUpload from 'graphql-upload-minimal/public/GraphQLUpload.js';
> ```

_Ways to `require`._

> ```js
> const { GraphQLUpload } = require('graphql-upload-minimal');
> ```
>
> ```js
> const GraphQLUpload = require('graphql-upload-minimal/public/GraphQLUpload');
> ```

_Setup for a schema built with [`makeExecutableSchema`](https://apollographql.com/docs/graphql-tools/generate-schema#makeExecutableSchema)._

> ```js
> const { makeExecutableSchema } = require('graphql-tools');
> const { GraphQLUpload } = require('graphql-upload-minimal');
>
> const schema = makeExecutableSchema({
>   typeDefs: /* GraphQL */ `
>     scalar Upload
>   `,
>   resolvers: {
>     Upload: GraphQLUpload,
>   },
> });
> ```

_A manually constructed schema with an image upload mutation._

> ```js
> const {
>   GraphQLSchema,
>   GraphQLObjectType,
>   GraphQLBoolean,
> } = require('graphql');
> const { GraphQLUpload } = require('graphql-upload-minimal');
>
> const schema = new GraphQLSchema({
>   mutation: new GraphQLObjectType({
>     name: 'Mutation',
>     fields: {
>       uploadImage: {
>         description: 'Uploads an image.',
>         type: GraphQLBoolean,
>         args: {
>           image: {
>             description: 'Image file.',
>             type: GraphQLUpload,
>           },
>         },
>         async resolve(parent, { image }) {
>           const { filename, mimetype, createReadStream } = await image;
>           const stream = createReadStream();
>           // Promisify the stream and store the file, then…
>           return true;
>         },
>       },
>     },
>   }),
> });
> ```

* * *

### class Upload

A file expected to be uploaded as it has been declared in the `map` field of
a [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec).
The [`processRequest`](#function-processrequest) function places references to an
instance of this class wherever the file is expected in the
[GraphQL operation](#type-graphqloperation). The
[`Upload` scalar](#class-graphqlupload) derives it's value from the
[`promise`](#upload-instance-property-promise) property.

#### Examples

_Ways to `import`._

> ```js
> import { Upload } from 'graphql-upload-minimal';
> ```
>
> ```js
> import Upload from 'graphql-upload-minimal/public/Upload.js';
> ```

_Ways to `require`._

> ```js
> const { Upload } = require('graphql-upload-minimal');
> ```
>
> ```js
> const Upload = require('graphql-upload-minimal/public/Upload');
> ```

#### Upload instance method reject

Rejects the upload promise with an error. This should only be
utilized by [`processRequest`](#function-processrequest).

| Parameter | Type   | Description     |
| :-------- | :----- | :-------------- |
| `error`   | object | Error instance. |

#### Upload instance method resolve

Resolves the upload promise with the file upload details. This should
only be utilized by [`processRequest`](#function-processrequest).

| Parameter | Type                           | Description          |
| :-------- | :----------------------------- | :------------------- |
| `file`    | [FileUpload](#type-fileupload) | File upload details. |

#### Upload instance property file

The file upload details, available when the
[upload promise](#upload-instance-property-promise) resolves. This should only be
utilized by [`processRequest`](#function-processrequest).

**Type:** `undefined` | [FileUpload](#type-fileupload)

#### Upload instance property promise

Promise that resolves file upload details. This should only be utilized
by [`GraphQLUpload`](#class-graphqlupload).

**Type:** Promise&lt;[FileUpload](#type-fileupload)>

* * *

### function graphqlUploadExpress

Creates [Express](https://expressjs.com) middleware that processes
[GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec)
using [`processRequest`](#function-processrequest), ignoring non-multipart
requests. It sets the request body to be
[similar to a conventional GraphQL POST request](#type-graphqloperation) for
following GraphQL middleware to consume.

| Parameter                | Type                                                                                                 | Description                                                                                                  |
| :----------------------- | :--------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `options`                | [ProcessRequestOptions](#type-processrequestoptions)                                                 | Middleware options. Any [`ProcessRequestOptions`](#type-processrequestoptions) can be used.                  |
| `options.processRequest` | [ProcessRequestFunction](#type-processrequestfunction)? = [processRequest](#function-processrequest) | Used to process [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec). |

**Returns:** Function — Express middleware.

#### Examples

_Ways to `import`._

> ```js
> import { graphqlUploadExpress } from 'graphql-upload-minimal';
> ```
>
> ```js
> import graphqlUploadExpress from 'graphql-upload-minimal/public/graphqlUploadExpress.js';
> ```

_Ways to `require`._

> ```js
> const { graphqlUploadExpress } = require('graphql-upload-minimal');
> ```
>
> ```js
> const graphqlUploadExpress = require('graphql-upload-minimal/public/graphqlUploadExpress');
> ```

_Basic [`express-graphql`](https://npm.im/express-graphql) setup._

> ```js
> const express = require('express');
> const graphqlHTTP = require('express-graphql');
> const { graphqlUploadExpress } = require('graphql-upload-minimal');
> const schema = require('./schema');
>
> express()
>   .use(
>     '/graphql',
>     graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
>     graphqlHTTP({ schema })
>   )
>   .listen(3000);
> ```

* * *

### function graphqlUploadKoa

Creates [Koa](https://koajs.com) middleware that processes
[GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec)
using [`processRequest`](#function-processrequest), ignoring non-multipart
requests. It sets the request body to be
[similar to a conventional GraphQL POST request](#type-graphqloperation) for
following GraphQL middleware to consume.

| Parameter                | Type                                                                                                 | Description                                                                                                  |
| :----------------------- | :--------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `options`                | [ProcessRequestOptions](#type-processrequestoptions)                                                 | Middleware options. Any [`ProcessRequestOptions`](#type-processrequestoptions) can be used.                  |
| `options.processRequest` | [ProcessRequestFunction](#type-processrequestfunction)? = [processRequest](#function-processrequest) | Used to process [GraphQL multipart requests](https://github.com/jaydenseric/graphql-multipart-request-spec). |

**Returns:** Function — Koa middleware.

#### Examples

_Ways to `import`._

> ```js
> import { graphqlUploadKoa } from 'graphql-upload-minimal';
> ```
>
> ```js
> import graphqlUploadKoa from 'graphql-upload-minimal/public/graphqlUploadKoa.js';
> ```

_Ways to `require`._

> ```js
> const { graphqlUploadKoa } = require('graphql-upload-minimal');
> ```
>
> ```js
> const graphqlUploadKoa = require('graphql-upload-minimal/public/graphqlUploadKoa');
> ```

_Basic [`graphql-api-koa`](https://npm.im/graphql-api-koa) setup._

> ```js
> const Koa = require('koa');
> const bodyParser = require('koa-bodyparser');
> const { errorHandler, execute } = require('graphql-api-koa');
> const { graphqlUploadKoa } = require('graphql-upload-minimal');
> const schema = require('./schema');
>
> new Koa()
>   .use(errorHandler())
>   .use(bodyParser())
>   .use(graphqlUploadKoa({ maxFileSize: 10000000, maxFiles: 10 }))
>   .use(execute({ schema }))
>   .listen(3000);
> ```

* * *

### function processRequest

Processes a [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec).
It parses the `operations` and `map` fields to create an
[`Upload`](#class-upload) instance for each expected file upload, placing
references wherever the file is expected in the
[GraphQL operation](#type-graphqloperation) for the
[`Upload` scalar](#class-graphqlupload) to derive its value. Error objects
have HTTP `status` property and an appropriate HTTP error `name` property.

**Type:** [ProcessRequestFunction](#type-processrequestfunction)

#### Examples

_Ways to `import`._

> ```js
> import { processRequest } from 'graphql-upload-minimal';
> ```
>
> ```js
> import processRequest from 'graphql-upload-minimal/public/processRequest.js';
> ```

_Ways to `require`._

> ```js
> const { processRequest } = require('graphql-upload-minimal');
> ```
>
> ```js
> const processRequest = require('graphql-upload-minimal/public/processRequest');
> ```

* * *

### type FileUpload

File upload details that are only available after the file's field in the
[GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec)
has begun streaming in.

**Type:** object

| Property           | Type                                                           | Description                                                                                                                                         |
| :----------------- | :------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filename`         | string                                                         | File name.                                                                                                                                          |
| `mimetype`         | string                                                         | File MIME type. Provided by the client and can't be trusted.                                                                                        |
| `encoding`         | string                                                         | File stream transfer encoding.                                                                                                                      |
| `createReadStream` | [FileUploadCreateReadStream](#type-fileuploadcreatereadstream) | Creates a [Node.js readable stream](https://nodejs.org/api/stream.html#stream_readable_streams) of the file's contents, for processing and storage. |

* * *

### type FileUploadCreateReadStream

Creates a [Node.js readable stream](https://nodejs.org/api/stream.html#stream_readable_streams) of an [uploading file's](#type-fileupload) contents, for processing and storage. Multiple calls create independent streams. Throws if called after all resolvers have resolved, or after an error has interrupted the request.

**Type:** Function

**Returns:** Readable — [Node.js readable stream](https://nodejs.org/api/stream.html#stream_readable_streams) of the file's contents.

#### See

- [Node.js `Readable` stream constructor docs](https://nodejs.org/api/stream.html#stream_new_stream_readable_options).
- [Node.js stream backpressure guide](https://nodejs.org/es/docs/guides/backpressuring-in-streams).

* * *

### type GraphQLOperation

A GraphQL operation object in a shape that can be consumed and executed by
most GraphQL servers.

**Type:** object

| Property        | Type              | Description                                          |
| :-------------- | :---------------- | :--------------------------------------------------- |
| `query`         | string            | GraphQL document containing queries and fragments.   |
| `operationName` | string \| `null`? | GraphQL document operation name to execute.          |
| `variables`     | object \| `null`? | GraphQL document operation variables and values map. |

#### See

- [GraphQL over HTTP spec](https://github.com/APIs-guru/graphql-over-http#request-parameters).
- [Apollo Server POST requests](https://www.apollographql.com/docs/apollo-server/requests#postRequests).

* * *

### type ProcessRequestFunction

Processes a [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec).

**Type:** Function

| Parameter | Type                                                  | Description                                                                                               |
| :-------- | :---------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `req`     | IncomingMessage                                       | [Node.js HTTP server request instance](https://nodejs.org/api/http.html#http_class_http_incomingmessage). |
| `res`     | ServerResponse                                        | [Node.js HTTP server response instance](https://nodejs.org/api/http.html#http_class_http_serverresponse). |
| `options` | [ProcessRequestOptions](#type-processrequestoptions)? | Options for processing the request.                                                                       |

**Returns:** Promise&lt;[GraphQLOperation](#type-graphqloperation) | Array&lt;[GraphQLOperation](#type-graphqloperation)>> — GraphQL operation or batch of operations for a GraphQL server to consume (usually as the request body).

#### See

- [`processRequest`](#function-processrequest).

* * *

### type ProcessRequestOptions

Options for processing a [GraphQL multipart request](https://github.com/jaydenseric/graphql-multipart-request-spec).

**Type:** object

| Property       | Type                | Description                                                                                                                                                                |
| :------------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxFieldSize` | number? = `1000000` | Maximum allowed non-file multipart form field size in bytes; enough for your queries.                                                                                      |
| `maxFileSize`  | number? = Infinity  | Maximum allowed file size in bytes.                                                                                                                                        |
| `maxFiles`     | number? = Infinity  | Maximum allowed number of files.                                                                                                                                           |
| `environment`  | string?             | Valid value are: "lambda" (AWS Lambda), "gcf" (Google Cloud Functions), "azure" (Azure Functions). Set this if you are running the file uploads in serverless environment. |
