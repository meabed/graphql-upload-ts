import { createWriteStream } from 'node:fs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { createServer } from 'http';
import { type FileUpload, GraphQLUpload, processRequest } from '../../src';

async function saveFileFromStream(stream: NodeJS.ReadableStream, filename: string) {
  // save file to current directory
  let fileSize = 0;
  const outFilePath = `${__dirname}/uploaded-${Date.now()}-${filename}`;
  const rs = await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      fileSize += chunk.length;
    });
    stream
      .pipe(createWriteStream(outFilePath))
      .on('finish', () => {
        console.log(`File ${outFilePath} saved`);
        resolve(outFilePath);
      })
      .on('error', (err) => {
        console.error(`Error saving file ${outFilePath}`, err);
        reject(err);
      });
  });
  if (rs instanceof Error) throw rs;
  return {
    filename,
    fileSize,
    uri: outFilePath,
  };
}

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
    upload2Files(file: Upload!, file2: Upload!) : [File!]!
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
        const rs = await saveFileFromStream(stream, filename);
        return {
          filename,
          mimetype,
          encoding,
          fileSize: rs.fileSize,
          uri: rs.uri,
        };
      },
      upload2Files: async (ctx, args) => {
        console.log('upload2Files resolver ran');
        const { file, file2 } = args as { file: Promise<FileUpload>; file2: Promise<FileUpload> };
        const f1 = await file;
        const f2 = await file2;
        const stream1 = f1.createReadStream();
        const stream2 = f2.createReadStream();
        const rs1 = await saveFileFromStream(stream1, f1.filename);
        const rs2 = await saveFileFromStream(stream2, f2.filename);
        return [
          {
            filename: f1.filename,
            mimetype: f1.mimetype,
            encoding: f1.encoding,
            fileSize: rs1.fileSize,
            uri: rs1.uri,
          },
          {
            filename: f2.filename,
            mimetype: f2.mimetype,
            encoding: f2.encoding,
            fileSize: rs2.fileSize,
            uri: rs2.uri,
          },
        ];
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
  })
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
  })
);

const port = process.env.PORT || 4000;
httpServer.listen({ port }, () => {
  console.info(`🚀 Server ready at http://localhost:${port}/graphql`);
});
