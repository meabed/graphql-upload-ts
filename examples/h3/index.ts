import { createWriteStream } from 'node:fs';
import { createServer } from 'node:http';
import { ApolloServer, type ApolloServerOptions, type BaseContext } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { type FileUpload, GraphQLUpload, processRequest } from 'graphql-upload-ts';
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3';

const apolloSchema: ApolloServerOptions<BaseContext> = {
  typeDefs: `#graphql
  scalar Upload
  type File {
    uri: String!
    filename: String!
    mimetype: String!
    encoding: String!
    fileSize: Int!
  }
  type Query {
    hello: String!
  }
  type Mutation {
    uploadFile(file: Upload!) : File!
  }
  `,
  resolvers: {
    Upload: GraphQLUpload,
    Query: {
      hello: () => 'Hello World',
    },
    Mutation: {
      uploadFile: async (ctx, args) => {
        console.log('uploadFile resolver ran');
        const { file } = args as { file: Promise<FileUpload> };
        const { createReadStream, filename, mimetype, encoding } = await file;

        console.log(`Received file ${filename} with mimetype ${mimetype} and encoding ${encoding}`);
        // validate file type
        if (mimetype !== 'image/png') throw new Error('Only PNG files are allowed');

        const stream = createReadStream();
        // save file to current directory
        let fileSize = 0;
        const outFilePath = `${__dirname}/uploaded-${Date.now()}-${filename}`;
        await new Promise((resolve, reject) => {
          stream.on('data', (chunk) => {
            fileSize += chunk.length;
          });
          stream
            .pipe(createWriteStream(outFilePath))
            .on('finish', () => {
              console.log(`File ${outFilePath} saved`);
              resolve(null);
            })
            .on('error', (err) => {
              console.error(`Error saving file ${outFilePath}`, err);
              reject(err);
            });
        });
        return {
          filename,
          mimetype,
          encoding,
          fileSize,
          uri: outFilePath,
        };
      },
    },
  },
};

// Create Apollo Server
const apolloServer = new ApolloServer(apolloSchema);
await apolloServer.start();

// Create H3 app
const app = createApp();
const router = createRouter();

// GraphQL endpoint with upload support
router.use(
  '/graphql',
  defineEventHandler(async (event) => {
    const contentType = event.node.req.headers['content-type'] || '';

    // Handle multipart/form-data uploads
    if (contentType.includes('multipart/form-data')) {
      try {
        // Process the upload request
        const body = await processRequest(event.node.req, event.node.res, {
          maxFileSize: 10 * 1024 * 1024, // 10 MB
          maxFiles: 10,
        });

        // Set the processed body on the request for Apollo to use
        event.node.req.body = body;
      } catch (error) {
        console.error('Upload processing error:', error);
        event.node.res.statusCode = 400;
        return { errors: [{ message: 'Failed to process upload' }] };
      }
    }

    // Create and execute the GraphQL handler
    const handler = startServerAndCreateH3Handler(apolloServer, {
      context: async ({ event }) => ({
        headers: event.node.req.headers,
      }),
    });

    return handler(event);
  })
);

app.use(router);

// Start server
const server = createServer(toNodeListener(app));
const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
});
