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

[Installation](#-installation) • [Quick Start](#-quick-start) • [Complete Examples](#-complete-examples) • [API](#-api) • [Contributing](#-contributing)

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
- [Complete Examples](#-complete-examples)
  - [Manual Schema Construction](#manual-schema-construction-with-graphqljs)
  - [Express + Apollo Server](#express--apollo-server-v4)
  - [Koa + Apollo Server](#koa--apollo-server)
  - [Express + GraphQL Yoga](#express--graphql-yoga)
  - [NestJS Integration](#nestjs-integration)
  - [Image Upload with Validation](#image-upload-with-validation)
- [API Documentation](#-api-documentation)
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

### Build System

This package uses Rollup for bundling and provides CommonJS builds for maximum compatibility. The build configuration has been optimized for simplicity and reliability.

## 🚀 Quick Start

### Basic Setup with Express

```typescript
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { graphqlUploadExpress, GraphQLUpload } from 'graphql-upload-ts';
import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'Hello World',
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      uploadFile: {
        type: GraphQLString,
        args: {
          file: { type: GraphQLUpload },
        },
        async resolve(_, { file }) {
          const { filename, createReadStream } = await file;
          const stream = createReadStream();
          // Process your file here
          return `File ${filename} uploaded successfully`;
        },
      },
    },
  }),
});

const app = express();

// Important: graphqlUploadExpress middleware must come BEFORE graphqlHTTP
app.use(
  '/graphql',
  graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
  graphqlHTTP({ schema, graphiql: true })
);

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000/graphql');
});
```

## 📚 Complete Examples

### Manual Schema Construction with GraphQL.js

<details>
<summary>Click to expand example</summary>

When building schemas manually using GraphQL.js (without schema-first approach), you need to use the GraphQLUpload scalar directly:

```typescript
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
} from 'graphql';
import { GraphQLUpload } from 'graphql-upload-ts';
import fs from 'fs';
import path from 'path';

// Define custom types
const FileType = new GraphQLObjectType({
  name: 'File',
  fields: {
    filename: { type: GraphQLString },
    mimetype: { type: GraphQLString },
    encoding: { type: GraphQLString },
    url: { type: GraphQLString },
  },
});

// Create schema with mutations
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'Hello World',
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      // Single file upload
      singleUpload: {
        type: FileType,
        args: {
          file: { 
            type: new GraphQLNonNull(GraphQLUpload),
          },
        },
        async resolve(_, { file }) {
          const { filename, mimetype, encoding, createReadStream } = await file;
          
          // Create upload directory if it doesn't exist
          const uploadDir = path.join(__dirname, 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // Save file to filesystem
          const filePath = path.join(uploadDir, filename);
          const stream = createReadStream();
          const writeStream = fs.createWriteStream(filePath);
          stream.pipe(writeStream);
          
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          return {
            filename,
            mimetype,
            encoding,
            url: `/uploads/${filename}`,
          };
        },
      },
      
      // Multiple file uploads
      multipleUpload: {
        type: new GraphQLList(FileType),
        args: {
          files: { 
            type: new GraphQLNonNull(
              new GraphQLList(new GraphQLNonNull(GraphQLUpload))
            ),
          },
        },
        async resolve(_, { files }) {
          const uploadedFiles = [];
          
          for (const file of files) {
            const { filename, mimetype, encoding, createReadStream } = await file;
            // Process each file...
            uploadedFiles.push({ filename, mimetype, encoding });
          }
          
          return uploadedFiles;
        },
      },
    },
  }),
});
```

</details>

### Express + Apollo Server v4

<details>
<summary>Click to expand example</summary>

Complete setup with Apollo Server v4 and Express:

```typescript
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { graphqlUploadExpress, GraphQLUpload } from 'graphql-upload-ts';
import { createServer } from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';

// Type definitions
const typeDefs = `#graphql
  scalar Upload

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }

  type Query {
    hello: String
  }

  type Mutation {
    singleUpload(file: Upload!): File!
    multipleUpload(files: [Upload!]!): [File!]!
  }
`;

// Resolvers
const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    hello: () => 'Hello world!',
  },
  Mutation: {
    singleUpload: async (parent, { file }) => {
      const { createReadStream, filename, mimetype, encoding } = await file;
      
      // Stream file to cloud storage, filesystem, etc.
      const stream = createReadStream();
      
      // Example: Save to filesystem
      const path = require('path');
      const fs = require('fs');
      const out = fs.createWriteStream(path.join(__dirname, 'uploads', filename));
      stream.pipe(out);
      
      await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
      });
      
      return {
        filename,
        mimetype,
        encoding,
        url: `/uploads/${filename}`,
      };
    },
    
    multipleUpload: async (parent, { files }) => {
      const uploadedFiles = [];
      
      for (const file of files) {
        const { createReadStream, filename, mimetype, encoding } = await file;
        // Process each file
        uploadedFiles.push({
          filename,
          mimetype,
          encoding,
          url: `/uploads/${filename}`,
        });
      }
      
      return uploadedFiles;
    },
  },
};

// Server setup
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  
  await server.start();
  
  // Apply upload middleware BEFORE Apollo Server
  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    graphqlUploadExpress({
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.token }),
    })
  );
  
  await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
  console.log('🚀 Server ready at http://localhost:4000/graphql');
}

startServer();
```

</details>

### Koa + Apollo Server

<details>
<summary>Click to expand example</summary>

Complete Koa setup with Apollo Server:

```typescript
import Koa from 'koa';
import Router from '@koa/router';
import { ApolloServer } from '@apollo/server';
import { koaMiddleware } from '@as-integrations/koa';
import { graphqlUploadKoa, GraphQLUpload } from 'graphql-upload-ts';
import { createServer } from 'http';

const typeDefs = `#graphql
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
    uploadFile(file: Upload!): File!
    uploadFiles(files: [Upload!]!): [File!]!
  }
`;

const resolvers = {
  Upload: GraphQLUpload,
  Query: {
    hello: () => 'Hello from Koa!',
  },
  Mutation: {
    uploadFile: async (_, { file }) => {
      const { filename, mimetype, encoding, createReadStream } = await file;
      
      // Process file stream
      const stream = createReadStream();
      
      // Example: Upload to S3
      // const { S3 } = require('@aws-sdk/client-s3');
      // const { Upload } = require('@aws-sdk/lib-storage');
      // const s3 = new S3({ region: 'us-east-1' });
      // 
      // const upload = new Upload({
      //   client: s3,
      //   params: {
      //     Bucket: 'my-bucket',
      //     Key: filename,
      //     Body: stream,
      //     ContentType: mimetype,
      //   },
      // });
      // 
      // await upload.done();
      
      return { filename, mimetype, encoding };
    },
    
    uploadFiles: async (_, { files }) => {
      const uploadPromises = files.map(async (file) => {
        const { filename, mimetype, encoding, createReadStream } = await file;
        // Process each file
        return { filename, mimetype, encoding };
      });
      
      return Promise.all(uploadPromises);
    },
  },
};

async function startServer() {
  const app = new Koa();
  const router = new Router();
  const httpServer = createServer(app.callback());
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  
  await server.start();
  
  // Apply upload middleware
  app.use(graphqlUploadKoa({
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
  }));
  
  // Apply Apollo Server middleware
  router.all(
    '/graphql',
    koaMiddleware(server, {
      context: async ({ ctx }) => ({ token: ctx.headers.token }),
    })
  );
  
  app.use(router.routes());
  app.use(router.allowedMethods());
  
  httpServer.listen(4000, () => {
    console.log('🚀 Server ready at http://localhost:4000/graphql');
  });
}

startServer();
```

</details>

### Express + GraphQL Yoga

<details>
<summary>Click to expand example</summary>

Setup with GraphQL Yoga for a modern GraphQL server:

```typescript
import express from 'express';
import { createYoga, createSchema } from 'graphql-yoga';
import { graphqlUploadExpress, GraphQLUpload } from 'graphql-upload-ts';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    scalar Upload
    
    type File {
      filename: String!
      mimetype: String!
      encoding: String!
      content: String!
    }
    
    type Query {
      hello: String
    }
    
    type Mutation {
      readTextFile(file: Upload!): File!
      uploadImage(file: Upload!): File!
      uploadDocuments(files: [Upload!]!): [File!]!
    }
  `,
  resolvers: {
    Upload: GraphQLUpload,
    Query: {
      hello: () => 'Hello from Yoga!',
    },
    Mutation: {
      readTextFile: async (_, { file }) => {
        const { filename, mimetype, encoding, createReadStream } = await file;
        
        // Read text file content
        const stream = createReadStream();
        const chunks = [];
        
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        
        const content = Buffer.concat(chunks).toString('utf-8');
        
        return {
          filename,
          mimetype,
          encoding,
          content,
        };
      },
      
      uploadImage: async (_, { file }) => {
        const { filename, mimetype, encoding, createReadStream } = await file;
        
        // Validate image
        if (!mimetype.startsWith('image/')) {
          throw new Error('File must be an image');
        }
        
        const stream = createReadStream();
        
        // Example: Process with sharp for image manipulation
        // const sharp = require('sharp');
        // const processedImage = await sharp(stream)
        //   .resize(800, 600)
        //   .jpeg({ quality: 80 })
        //   .toBuffer();
        
        return {
          filename,
          mimetype,
          encoding,
          content: 'Image processed successfully',
        };
      },
      
      uploadDocuments: async (_, { files }) => {
        const results = [];
        
        for (const file of files) {
          const { filename, mimetype, encoding } = await file;
          results.push({
            filename,
            mimetype,
            encoding,
            content: `Document ${filename} uploaded`,
          });
        }
        
        return results;
      },
    },
  },
});

const app = express();

// Apply upload middleware BEFORE yoga
app.use(graphqlUploadExpress({
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 10,
}));

// Create and use Yoga
const yoga = createYoga({ 
  schema,
  graphiql: {
    title: 'GraphQL Yoga with File Uploads',
  },
});

app.use('/graphql', yoga);

app.listen(4000, () => {
  console.log('🧘 Server is running on http://localhost:4000/graphql');
});
```

</details>

### NestJS Integration

<details>
<summary>Click to expand example</summary>

For NestJS applications, you need special configuration:

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { graphqlUploadExpress } from 'graphql-upload-ts';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      // Disable built-in upload handling
      uploads: false,
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        graphqlUploadExpress({
          maxFileSize: 10 * 1024 * 1024, // 10 MB
          maxFiles: 5,
          // Important for NestJS!
          overrideSendResponse: false,
        })
      )
      .forRoutes('graphql');
  }
}

// upload.resolver.ts
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload-ts';
import { createWriteStream } from 'fs';

@Resolver()
export class UploadResolver {
  @Mutation(() => Boolean)
  async uploadFile(
    @Args({ name: 'file', type: () => GraphQLUpload })
    file: Promise<FileUpload>,
  ): Promise<boolean> {
    const { createReadStream, filename } = await file;
    
    return new Promise((resolve, reject) => {
      createReadStream()
        .pipe(createWriteStream(`./uploads/${filename}`))
        .on('finish', () => resolve(true))
        .on('error', reject);
    });
  }
}
```

</details>

### TypeGraphQL Integration

<details>
<summary>Click to expand example</summary>

For TypeGraphQL, you need to create a custom scalar wrapper:

```typescript
// upload.scalar.ts
import { GraphQLUpload } from 'graphql-upload-ts';
import { Scalar, CustomScalar } from 'type-graphql';
import { GraphQLScalarType, GraphQLError } from 'graphql';

// Create a custom Upload scalar for TypeGraphQL
@Scalar('Upload')
export class UploadScalar implements CustomScalar<any, any> {
  description = 'The `Upload` scalar type represents a file upload.';

  parseValue(value: any) {
    return GraphQLUpload.parseValue(value);
  }

  serialize(value: any) {
    return GraphQLUpload.serialize(value);
  }

  parseLiteral(ast: any) {
    return GraphQLUpload.parseLiteral(ast, null);
  }
}

// Define the FileUpload type for TypeScript
import { Stream } from 'stream';
import { Field, ObjectType, InputType } from 'type-graphql';

interface Upload {
  filename: string;
  mimetype: string;
  encoding: string;
  createReadStream: () => Stream;
}

// Output type for file information
@ObjectType()
export class FileInfo {
  @Field()
  filename: string;

  @Field()
  mimetype: string;

  @Field()
  encoding: string;

  @Field()
  url: string;
}

// Input type for mutations with files and additional fields
@InputType()
export class CreatePostInput {
  @Field()
  title: string;

  @Field()
  content: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  // Note: File upload fields are handled separately in resolver args
}

// resolver.ts
import { Resolver, Mutation, Arg, Query } from 'type-graphql';
import { GraphQLUpload } from 'graphql-upload-ts';
import { FileInfo, CreatePostInput } from './types';
import { createWriteStream } from 'fs';
import path from 'path';

@Resolver()
export class PostResolver {
  // Simple file upload
  @Mutation(() => FileInfo)
  async uploadFile(
    @Arg('file', () => GraphQLUpload)
    file: Promise<Upload>
  ): Promise<FileInfo> {
    const { filename, mimetype, encoding, createReadStream } = await file;
    
    // Save file to disk
    const savePath = path.join(__dirname, 'uploads', filename);
    const stream = createReadStream();
    const writeStream = createWriteStream(savePath);
    stream.pipe(writeStream);
    
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    return {
      filename,
      mimetype,
      encoding,
      url: `/uploads/${filename}`,
    };
  }

  // File upload with additional form fields
  @Mutation(() => Boolean)
  async createPostWithImage(
    @Arg('data') data: CreatePostInput,
    @Arg('image', () => GraphQLUpload)
    image: Promise<Upload>,
    @Arg('thumbnail', () => GraphQLUpload, { nullable: true })
    thumbnail?: Promise<Upload>
  ): Promise<boolean> {
    // Process the main image
    const mainImage = await image;
    const { filename, createReadStream } = mainImage;
    
    // Save the main image
    const imagePath = path.join(__dirname, 'uploads', 'posts', filename);
    const imageStream = createReadStream();
    const imageWriteStream = createWriteStream(imagePath);
    imageStream.pipe(imageWriteStream);
    
    // Process thumbnail if provided
    if (thumbnail) {
      const thumbFile = await thumbnail;
      const thumbPath = path.join(__dirname, 'uploads', 'posts', 'thumbnails', thumbFile.filename);
      const thumbStream = thumbFile.createReadStream();
      const thumbWriteStream = createWriteStream(thumbPath);
      thumbStream.pipe(thumbWriteStream);
    }
    
    // Save post data to database
    console.log('Creating post with:', {
      title: data.title,
      content: data.content,
      tags: data.tags,
      imagePath,
    });
    
    // In a real app, save to database here
    
    return true;
  }

  // Multiple file uploads with metadata
  @Mutation(() => [FileInfo])
  async uploadMultipleFiles(
    @Arg('files', () => [GraphQLUpload])
    files: Promise<Upload>[],
    @Arg('descriptions', () => [String], { nullable: true })
    descriptions?: string[]
  ): Promise<FileInfo[]> {
    const uploadedFiles: FileInfo[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = await files[i];
      const { filename, mimetype, encoding, createReadStream } = file;
      const description = descriptions?.[i] || '';
      
      // Save each file
      const savePath = path.join(__dirname, 'uploads', filename);
      const stream = createReadStream();
      const writeStream = createWriteStream(savePath);
      stream.pipe(writeStream);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // Store metadata if needed
      console.log(`File ${filename} uploaded with description: ${description}`);
      
      uploadedFiles.push({
        filename,
        mimetype,
        encoding,
        url: `/uploads/${filename}`,
      });
    }
    
    return uploadedFiles;
  }
}

// server.ts - Setting up the server
import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSchema } from 'type-graphql';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { PostResolver } from './resolver';
import { UploadScalar } from './upload.scalar';

async function bootstrap() {
  // Build TypeGraphQL schema
  const schema = await buildSchema({
    resolvers: [PostResolver],
    scalarsMap: [{ type: Object, scalar: UploadScalar }],
  });

  // Create Apollo Server
  const server = new ApolloServer({ schema });
  await server.start();

  // Create Express app
  const app = express();

  // IMPORTANT: Apply upload middleware BEFORE Apollo Server
  app.use(
    '/graphql',
    graphqlUploadExpress({
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    }),
    express.json(),
    expressMiddleware(server)
  );

  app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000/graphql');
  });
}

bootstrap();
```

#### Example GraphQL Mutations

```graphql
# Simple file upload
mutation UploadFile($file: Upload!) {
  uploadFile(file: $file) {
    filename
    mimetype
    url
  }
}

# Upload with additional fields
mutation CreatePost($data: CreatePostInput!, $image: Upload!, $thumbnail: Upload) {
  createPostWithImage(data: $data, image: $image, thumbnail: $thumbnail)
}

# Multiple files with descriptions
mutation UploadMultiple($files: [Upload!]!, $descriptions: [String!]) {
  uploadMultipleFiles(files: $files, descriptions: $descriptions) {
    filename
    url
  }
}
```

#### Client-Side Example (using Apollo Client)

```javascript
import { gql, useMutation } from '@apollo/client';

const UPLOAD_WITH_DATA = gql`
  mutation CreatePost($data: CreatePostInput!, $image: Upload!) {
    createPostWithImage(data: $data, image: $image)
  }
`;

function PostForm() {
  const [createPost] = useMutation(UPLOAD_WITH_DATA);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const file = formData.get('image');
    const data = {
      title: formData.get('title'),
      content: formData.get('content'),
      tags: formData.get('tags').split(','),
    };

    await createPost({
      variables: {
        data,
        image: file,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Post Title" required />
      <textarea name="content" placeholder="Content" required />
      <input name="tags" placeholder="Tags (comma-separated)" />
      <input name="image" type="file" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

</details>

### Image Upload with Validation

<details>
<summary>Click to expand example</summary>

Complete example with image validation, resizing, and cloud storage:

```typescript
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { graphqlUploadExpress, GraphQLUpload } from 'graphql-upload-ts';
import { validateMimeType, validateFileExtension, sanitizeFilename } from 'graphql-upload-ts';
import sharp from 'sharp';
import { S3 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';

const schema = buildSchema(`
  scalar Upload
  
  type Image {
    id: String!
    originalName: String!
    filename: String!
    mimetype: String!
    size: Int!
    width: Int!
    height: Int!
    url: String!
    thumbnailUrl: String!
  }
  
  type Mutation {
    uploadProfileImage(file: Upload!): Image!
    uploadGalleryImages(files: [Upload!]!): [Image!]!
  }
  
  type Query {
    hello: String
  }
`);

const s3 = new S3({ region: process.env.AWS_REGION });

const resolvers = {
  Upload: GraphQLUpload,
  
  Mutation: {
    uploadProfileImage: async (_, { file }) => {
      const { filename, mimetype, createReadStream } = await file;
      
      // Validate image type
      const mimeValidation = validateMimeType(mimetype, [
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
      
      if (!mimeValidation.isValid) {
        throw new Error(mimeValidation.error);
      }
      
      // Validate file extension
      const extValidation = validateFileExtension(filename, [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
      ]);
      
      if (!extValidation.isValid) {
        throw new Error(extValidation.error);
      }
      
      // Sanitize filename
      const sanitized = sanitizeFilename(filename);
      const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${sanitized}`;
      
      // Read the stream into a buffer for processing
      const stream = createReadStream();
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Process image with sharp
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Validate image dimensions
      if (metadata.width < 100 || metadata.height < 100) {
        throw new Error('Image must be at least 100x100 pixels');
      }
      
      // Create main image (max 1920x1080)
      const mainImage = await image
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      
      // Create thumbnail (200x200)
      const thumbnail = await sharp(buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // Upload main image to S3
      const mainUpload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.S3_BUCKET,
          Key: `images/${uniqueFilename}`,
          Body: mainImage,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=31536000',
        },
      });
      
      // Upload thumbnail to S3
      const thumbUpload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.S3_BUCKET,
          Key: `thumbnails/${uniqueFilename}`,
          Body: thumbnail,
          ContentType: 'image/jpeg',
          CacheControl: 'max-age=31536000',
        },
      });
      
      const [mainResult, thumbResult] = await Promise.all([
        mainUpload.done(),
        thumbUpload.done(),
      ]);
      
      return {
        id: crypto.randomUUID(),
        originalName: filename,
        filename: uniqueFilename,
        mimetype: 'image/jpeg',
        size: mainImage.length,
        width: metadata.width,
        height: metadata.height,
        url: mainResult.Location,
        thumbnailUrl: thumbResult.Location,
      };
    },
    
    uploadGalleryImages: async (_, { files }) => {
      const uploadPromises = files.map(async (filePromise) => {
        const file = await filePromise;
        // Process each image similarly
        // ... implementation
      });
      
      return Promise.all(uploadPromises);
    },
  },
};

const app = express();

// Configure upload middleware with strict limits for images
app.use(
  '/graphql',
  graphqlUploadExpress({
    maxFileSize: 5 * 1024 * 1024, // 5 MB max for images
    maxFiles: 10, // Max 10 images at once
  }),
  graphqlHTTP({
    schema,
    rootValue: resolvers,
    graphiql: true,
  })
);

app.listen(4000, () => {
  console.log('Image upload server running on http://localhost:4000/graphql');
});
```

</details>

## 📖 API Documentation

### Middleware Functions

#### `graphqlUploadExpress(options?)`

Express middleware for handling multipart/form-data requests.

```typescript
import { graphqlUploadExpress } from 'graphql-upload-ts';

app.use('/graphql', graphqlUploadExpress({
  maxFileSize: 10000000,  // 10 MB for file uploads (default: 5 MB)
  maxFiles: 10,           // Max number of files (default: Infinity)
  maxFieldSize: 1000000,  // 1 MB for JSON fields (default: 1 MB)
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
  createReadStream: (options?: ReadStreamOptions) => NodeJS.ReadableStream;
}

interface ReadStreamOptions {
  encoding?: BufferEncoding;
  highWaterMark?: number;
}
```

#### `UploadOptions`

Configuration options for the middleware:

```typescript
interface UploadOptions {
  maxFieldSize?: number;  // Max size of non-file fields like JSON (default: 1 MB)
  maxFileSize?: number;   // Max size per file upload (default: 5 MB) 
  maxFiles?: number;      // Max number of files (default: Infinity)
}
```

### Scalar Type

#### `GraphQLUpload`

The GraphQL scalar type for file uploads. Use it in your schema:

```typescript
import { GraphQLUpload } from 'graphql-upload-ts';

// For schema-first approach (SDL)
const resolvers = {
  Upload: GraphQLUpload,
  // ... other resolvers
};

// For code-first approach
import { GraphQLScalarType } from 'graphql';
const Upload: GraphQLScalarType = GraphQLUpload;
```

## 🛡️ Security & Validation

### Built-in Protections

The library includes several security features:

- **File size limits** - Prevent large file DoS attacks
- **File count limits** - Restrict number of concurrent uploads
- **Field size limits** - Limit non-file field sizes
- **Filename sanitization** - Remove unsafe characters from filenames
- **MIME type validation** - Optional MIME type restrictions

### Validation Utilities

```typescript
import { 
  validateMimeType, 
  validateFileExtension, 
  sanitizeFilename 
} from 'graphql-upload-ts';

// Validate MIME type
const mimeResult = validateMimeType(mimetype, ['image/jpeg', 'image/png']);
if (!mimeResult.isValid) {
  throw new Error(mimeResult.error);
}

// Validate file extension
const extResult = validateFileExtension(filename, ['.jpg', '.jpeg', '.png']);
if (!extResult.isValid) {
  throw new Error(extResult.error);
}

// Sanitize filename for safe storage
const safe = sanitizeFilename('../../dangerous/file name!.txt');
// Returns: "dangerous-file-name.txt"
```

### Error Handling

The library provides custom error classes:

```typescript
import { UploadError, UploadErrorCode } from 'graphql-upload-ts';

try {
  // Upload logic
} catch (error) {
  if (error instanceof UploadError) {
    switch (error.code) {
      case UploadErrorCode.FILE_TOO_LARGE:
        // Handle large file
        break;
      case UploadErrorCode.INVALID_FILE_TYPE:
        // Handle invalid type
        break;
      // ... handle other cases
    }
  }
}
```

Error codes available:
- `FILE_TOO_LARGE` - File exceeds maxFileSize
- `TOO_MANY_FILES` - Too many files uploaded
- `INVALID_FILE_TYPE` - File type not allowed
- `STREAM_ERROR` - Error reading file stream
- `FIELD_SIZE_EXCEEDED` - Non-file field too large
- `MISSING_MULTIPART_BOUNDARY` - Invalid request format
- `INVALID_MULTIPART_REQUEST` - Malformed multipart request

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
- CommonJS build for maximum compatibility
- Built-in validation utilities
- Custom error classes
- Modern Node.js features (16+)

### Important Notes

1. **Middleware Order**: Always apply the upload middleware BEFORE your GraphQL middleware
2. **File Processing**: Process uploads inside resolvers, not after response
3. **Stream Handling**: Always consume or destroy streams to prevent memory leaks
4. **Error Handling**: Implement proper error handling for failed uploads
5. **NestJS**: Use `overrideSendResponse: false` option

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

# Build the library (using Rollup)
npm run build

# Run linting (using Biome)
npm run lint

# Format code (using Biome)
npm run format

# Type checking
npm run typecheck
```

#### Build Configuration

The project uses:
- **Rollup** - For bundling the TypeScript source into CommonJS format
- **Biome** - For linting and formatting (replacing ESLint and Prettier)
- **Jest** - For testing with comprehensive coverage
- **TypeScript** - With strict mode enabled for type safety

## 📄 License

[MIT](./LICENSE) © Mohamed Meabed

## 🙏 Acknowledgments

This library is a TypeScript fork of [`graphql-upload`](https://github.com/jaydenseric/graphql-upload) by Jayden Seric. The original library was exceptionally well designed, and this fork aims to maintain that quality while adding TypeScript support and modern features.

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/graphql-upload-ts)
- [GitHub Repository](https://github.com/meabed/graphql-upload-ts)
- [GraphQL Multipart Request Spec](https://github.com/jaydenseric/graphql-multipart-request-spec)
- [Issue Tracker](https://github.com/meabed/graphql-upload-ts/issues)
- [Examples Directory](https://github.com/meabed/graphql-upload-ts/tree/master/examples)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/meabed">Mohamed Meabed</a>
</div>