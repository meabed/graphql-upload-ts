import { createWriteStream } from 'node:fs';
import { ApolloServer, type ApolloServerOptions, type BaseContext } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { type FileUpload, GraphQLUpload, graphqlUploadExpress } from '../../src';

const contextFnInjections = (req) => {
  const { user } = req;
  return {
    user,
  };
};

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

async function applyMiddlewares(app, httpServer) {
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

  apolloSchema.plugins = [ApolloServerPluginDrainHttpServer({ httpServer })];
  apolloSchema.allowBatchedHttpRequests = true;
  // apolloSchema.csrfPrevention = false;
  const apolloServer = new ApolloServer(apolloSchema);
  await apolloServer.start();

  app.use(
    '/graphql',
    graphqlUploadExpress({ overrideSendResponse: false }),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => contextFnInjections(req),
    })
  );
}

async function initServer() {
  const app = express();
  const httpServer = createServer(app);
  await applyMiddlewares(app, httpServer);

  return httpServer;
}

initServer().then((httpServer) => {
  const port = process.env.PORT || 4000;
  httpServer.listen({ port }, () => {
    console.info(`🚀 Server ready at http://localhost:${port}/graphql`);
  });
});
