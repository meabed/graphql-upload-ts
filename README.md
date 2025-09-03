# GraphQL Upload for TypeScript

<div align="center">

[![NPM version](https://img.shields.io/npm/v/graphql-upload-ts)](https://npm.im/graphql-upload-ts)
[![Build Status](https://github.com/meabed/graphql-upload-ts/workflows/CI/badge.svg)](https://github.com/meabed/graphql-upload-ts/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-91.62%25-brightgreen)](https://github.com/meabed/graphql-upload-ts)
[![Downloads](https://img.shields.io/npm/dm/graphql-upload-ts.svg)](https://www.npmjs.com/package/graphql-upload-ts)
[![License](https://img.shields.io/npm/l/graphql-upload-ts)](https://github.com/meabed/graphql-upload-ts/blob/master/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/node/v/graphql-upload-ts)](https://nodejs.org)

**A minimalistic, type-safe middleware for handling GraphQL file uploads in Node.js**

[Installation](#-installation) • [Quick Start](#-quick-start) • [Examples](#-examples) • [API](#-api) • [Contributing](#-contributing)

</div>

## ✨ Features

- 🚀 **Full TypeScript Support** - Written in TypeScript with complete type definitions
- 📦 **Framework Agnostic** - Works with Express, Koa, Apollo Server, and more
- 🔒 **Type-Safe** - Strict TypeScript mode enabled with comprehensive type coverage
- 🎯 **Production Ready** - Battle-tested with 91%+ test coverage
- ⚡ **High Performance** - Efficient file streaming with configurable limits
- 🛡️ **Security First** - Built-in file validation and sanitization
- 📝 **Well Documented** - Extensive documentation and real-world examples
- 🔄 **Dual Module Support** - CommonJS and ESM modules included

## 📋 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Examples](#-examples)
- [API Documentation](#-api)
- [File Upload Handling](#-file-upload-handling)
- [Security & Validation](#-security--validation)
- [Architecture](#-architecture)
- [Migration Guide](#-migration-guide)
- [Contributing](#-contributing)
- [License](#-license)

## 📦 Installation

```bash
npm install graphql-upload-ts graphql
# or
yarn add graphql-upload-ts graphql
# or
pnpm add graphql-upload-ts graphql
```

### Requirements

- Node.js >= 16
- GraphQL >= 0.13.1

## 🚀 Quick Start

### Express + Apollo Server

```typescript
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { graphqlUploadExpress, GraphQLUpload } from 'graphql-upload-ts';

const typeDefs = `
  scalar Upload

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type Query {
    hello: String
  }

  type Mutation {
    singleUpload(file: Upload!): File!
  }
`;

const resolvers = {
  Upload: GraphQLUpload,
  Mutation: {
    singleUpload: async (parent, { file }) => {
      const { createReadStream, filename, mimetype, encoding } = await file;
      
      // Stream file to cloud storage, filesystem, etc.
      const stream = createReadStream();
      
      // Process the file stream here...
      
      return { filename, mimetype, encoding };
    },
  },
};

const app = express();

// Add upload middleware BEFORE Apollo Server
app.use(graphqlUploadExpress({
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 5,
}));

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use('/graphql', expressMiddleware(server));
```

### Koa + GraphQL Yoga

```typescript
import Koa from 'koa';
import { createYoga, createSchema } from 'graphql-yoga';
import { graphqlUploadKoa, GraphQLUpload } from 'graphql-upload-ts';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    scalar Upload
    
    type Mutation {
      uploadFile(file: Upload!): String
    }
  `,
  resolvers: {
    Upload: GraphQLUpload,
    Mutation: {
      uploadFile: async (_, { file }) => {
        const { filename, createReadStream } = await file;
        const stream = createReadStream();
        // Handle file stream
        return `Uploaded: ${filename}`;
      },
    },
  },
});

const app = new Koa();

// Add upload middleware
app.use(graphqlUploadKoa({
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 5,
}));

const yoga = createYoga({ schema });
app.use(yoga.middleware());
```

## 📚 Examples

Check out the [examples](./examples) directory for complete working examples:

- [Apollo Server with Express](./examples/apollo)
- [Express with GraphQL-HTTP](./examples/express/graphql-http.ts)
- [Express with GraphQL Yoga](./examples/express/graphql-yoga.ts)
- [Koa with Apollo Server](./examples/koa)

## 📖 API

### Middleware Functions

#### `graphqlUploadExpress(options?)`

Express middleware for handling multipart/form-data requests.

```typescript
import { graphqlUploadExpress } from 'graphql-upload-ts';

app.use('/graphql', graphqlUploadExpress({
  maxFileSize: 10000000, // 10 MB (default: Infinity)
  maxFiles: 10,          // Max number of files (default: Infinity)
  maxFieldSize: 1000000, // Max field size in bytes (default: 1 MB)
  overrideSendResponse: false, // For use with NestJS (default: false)
}));
```

#### `graphqlUploadKoa(options?)`

Koa middleware for handling multipart/form-data requests.

```typescript
import { graphqlUploadKoa } from 'graphql-upload-ts';

app.use(graphqlUploadKoa({
  maxFileSize: 10000000, // 10 MB
  maxFiles: 10,
}));
```

### Types

#### `FileUpload`

The promise returned from uploaded files contains:

```typescript
interface FileUpload {
  filename: string;
  mimetype: string;
  encoding: string;
  fieldName: string;
  createReadStream: () => NodeJS.ReadableStream;
}
```

#### `UploadOptions`

Configuration options for the middleware:

```typescript
interface UploadOptions {
  maxFieldSize?: number;  // Max size of non-file fields (default: 1 MB)
  maxFileSize?: number;   // Max size per file (default: Infinity)
  maxFiles?: number;      // Max number of files (default: Infinity)
}
```

### Scalar Type

#### `GraphQLUpload`

The GraphQL scalar type for file uploads. Add it to your schema resolvers:

```typescript
import { GraphQLUpload } from 'graphql-upload-ts';

const resolvers = {
  Upload: GraphQLUpload,
  // ... other resolvers
};
```

## 📁 File Upload Handling

### Single File Upload

```typescript
const resolvers = {
  Mutation: {
    uploadFile: async (_, { file }: { file: Promise<FileUpload> }) => {
      const { filename, mimetype, createReadStream } = await file;
      
      const stream = createReadStream();
      
      // Example: Save to filesystem
      const out = createWriteStream(`./uploads/${filename}`);
      stream.pipe(out);
      await finished(out);
      
      return { filename, mimetype };
    },
  },
};
```

### Multiple File Uploads

```typescript
const resolvers = {
  Mutation: {
    uploadFiles: async (_, { files }: { files: Promise<FileUpload>[] }) => {
      const uploadedFiles = await Promise.all(files);
      
      for (const file of uploadedFiles) {
        const { filename, createReadStream } = file;
        // Process each file
      }
      
      return uploadedFiles.map(f => ({ filename: f.filename }));
    },
  },
};
```

### Upload to Cloud Storage (S3 Example)

```typescript
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const s3 = new S3({ region: 'us-east-1' });

const resolvers = {
  Mutation: {
    uploadToS3: async (_, { file }) => {
      const { filename, mimetype, createReadStream } = await file;
      
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: 'my-bucket',
          Key: `uploads/${Date.now()}-${filename}`,
          Body: createReadStream(),
          ContentType: mimetype,
        },
      });
      
      const result = await upload.done();
      return { url: result.Location };
    },
  },
};
```

## 🛡️ Security & Validation

### Built-in Protections

The library includes several security features:

- **File size limits** - Prevent large file DoS attacks
- **File count limits** - Restrict number of concurrent uploads
- **Field size limits** - Limit non-file field sizes
- **Filename sanitization** - Remove unsafe characters from filenames
- **MIME type validation** - Optional MIME type restrictions

### Custom Validation Example

```typescript
import { validateFileExtension, validateMimeType } from 'graphql-upload-ts';

const resolvers = {
  Mutation: {
    uploadImage: async (_, { file }) => {
      const { filename, mimetype, createReadStream } = await file;
      
      // Validate file type
      const mimeValidation = validateMimeType(mimetype, ['image/jpeg', 'image/png']);
      if (!mimeValidation.isValid) {
        throw new Error(mimeValidation.error);
      }
      
      // Validate extension
      const extValidation = validateFileExtension(filename, ['.jpg', '.jpeg', '.png']);
      if (!extValidation.isValid) {
        throw new Error(extValidation.error);
      }
      
      // Process validated file...
      
      return { success: true };
    },
  },
};
```

### Error Handling

The library provides custom error classes for better error handling:

```typescript
import { UploadError, UploadErrorCode } from 'graphql-upload-ts';

// Error codes available:
// - FILE_TOO_LARGE
// - TOO_MANY_FILES
// - INVALID_FILE_TYPE
// - STREAM_ERROR
// - FIELD_SIZE_EXCEEDED
// - MISSING_MULTIPART_BOUNDARY
// - INVALID_MULTIPART_REQUEST
```

## 🏗️ Architecture

The library uses a streaming architecture for efficient file handling:

1. **Request Parsing** - [`busboy`](https://npm.im/busboy) parses multipart requests
2. **File Buffering** - Files are buffered to filesystem using [`fs-capacitor`](https://npm.im/fs-capacitor)
3. **Promise Resolution** - Upload promises resolve with file details
4. **Stream Creation** - Resolvers can create multiple read streams from buffered files
5. **Cleanup** - Temporary files are automatically cleaned up after response

This architecture allows:
- Processing files in any order
- Multiple reads of the same file
- Backpressure handling
- Automatic cleanup

## 🔄 Migration Guide

### From `graphql-upload` v15+

This library is a TypeScript-first alternative with similar API:

```typescript
// Before (graphql-upload)
const { graphqlUploadExpress } = require('graphql-upload');
const { GraphQLUpload } = require('graphql-upload');

// After (graphql-upload-ts)
import { graphqlUploadExpress, GraphQLUpload } from 'graphql-upload-ts';
```

Main differences:
- Full TypeScript support with strict types
- ESM and CommonJS dual module support
- Built-in validation utilities
- Custom error classes
- Modern Node.js features (16+)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build the library
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Testing

The library maintains high test coverage (91%+) with comprehensive test suites:

```bash
npm test
```

## 📄 License

[MIT](./LICENSE) © Mohamed Meabed

## 🙏 Acknowledgments

This library is a TypeScript fork of [`graphql-upload`](https://github.com/jaydenseric/graphql-upload) by Jayden Seric. The original library was exceptionally well designed, and this fork aims to maintain that quality while adding TypeScript support and modern features.

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/graphql-upload-ts)
- [GitHub Repository](https://github.com/meabed/graphql-upload-ts)
- [GraphQL Multipart Request Spec](https://github.com/jaydenseric/graphql-multipart-request-spec)
- [Issue Tracker](https://github.com/meabed/graphql-upload-ts/issues)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/meabed">Mohamed Meabed</a>
</div>