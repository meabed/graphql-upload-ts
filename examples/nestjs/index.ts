import { createWriteStream } from 'node:fs';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { FileUpload, GraphQLUpload, processRequest } from '../../src';
import { createHandler } from 'graphql-http/lib/use/express';
import { makeExecutableSchema } from '@graphql-tools/schema';

const contextFnInjections = (req) => {
  const { user } = req;
  return {
    user,
  };
};

const gqlSchema = makeExecutableSchema({
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
});

const app = express();
const httpServer = createServer(app);
app.use(
  cors({
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 600,
    origin: true,
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  '/graphql',
  createHandler({
    schema: gqlSchema,
    context: contextFnInjections,
    parseRequestParams: async (req) => {
      const params = await processRequest(req.raw, req.context.res);
      if (Array.isArray(params)) {
        throw new Error('Batching is not supported');
      }
      return {
        ...params,
        // variables must be an object as per the GraphQL over HTTP spec
        variables: Object(params.variables),
      };
    },
  }),
);

const port = process.env.PORT || 4000;
httpServer.listen({ port }, () => {
  console.info(`🚀 Server ready at http://localhost:${port}/graphql`);
});
