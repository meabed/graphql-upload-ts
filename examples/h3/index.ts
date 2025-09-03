import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3';
import { createServer } from 'node:http';
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { GraphQLUpload, processRequest, validateMimeType } from 'graphql-upload-ts';
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLNonNull } from 'graphql';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
await mkdir(join(__dirname, './uploads'), { recursive: true });

// Define the File type (matching other examples)
const FileType = new GraphQLObjectType({
  name: 'File',
  fields: {
    uri: { type: GraphQLString },
    filename: { type: GraphQLString },
    mimetype: { type: GraphQLString },
    encoding: { type: GraphQLString },
    fileSize: { type: GraphQLInt },
  },
});

// Create GraphQL schema
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'Hello from H3 + GraphQL Upload!',
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      // Single file upload with validation (matching other examples)
      uploadFile: {
        type: FileType,
        args: {
          file: {
            type: new GraphQLNonNull(GraphQLUpload),
          },
        },
        async resolve(_, { file }) {
          const { filename, mimetype, encoding, createReadStream } = await file;
          
          // Validate mime type (only accept PNG like other examples)
          const mimeValidation = validateMimeType(mimetype, ['image/png']);
          if (!mimeValidation.isValid) {
            throw new Error(`Invalid file type. Only PNG images are allowed. Received: ${mimetype}`);
          }
          
          // Save file to filesystem
          const uploadPath = join(__dirname, './uploads', filename);
          const stream = createReadStream();
          const writeStream = createWriteStream(uploadPath);
          
          let fileSize = 0;
          stream.on('data', (chunk) => {
            fileSize += chunk.length;
          });
          
          stream.pipe(writeStream);
          
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          console.log(`File uploaded: ${filename} (${fileSize} bytes)`);
          
          return {
            uri: `/uploads/${filename}`,
            filename,
            mimetype,
            encoding,
            fileSize,
          };
        },
      },
    },
  }),
});

// Create Apollo Server
const apollo = new ApolloServer({
  schema,
});

await apollo.start();

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
    const handler = startServerAndCreateH3Handler(apollo, {
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