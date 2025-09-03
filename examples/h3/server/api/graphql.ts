import { ApolloServer } from '@apollo/server';
import { startServerAndCreateH3Handler } from '@as-integrations/h3';
import { GraphQLUpload, processRequest } from 'graphql-upload-ts';
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull } from 'graphql';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineEventHandler, readBody, getHeaders, setResponseStatus } from 'h3';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
await mkdir(join(__dirname, '../../uploads'), { recursive: true });

// Define the File type
const FileType = new GraphQLObjectType({
  name: 'File',
  fields: {
    filename: { type: GraphQLString },
    mimetype: { type: GraphQLString },
    encoding: { type: GraphQLString },
    url: { type: GraphQLString },
  },
});

// Create schema
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
        resolve: () => 'Hello from H3 + GraphQL!',
      },
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      // Single file upload
      uploadFile: {
        type: FileType,
        args: {
          file: {
            type: new GraphQLNonNull(GraphQLUpload),
          },
        },
        async resolve(_, { file }) {
          const { filename, mimetype, encoding, createReadStream } = await file;
          
          // Save file to filesystem
          const uploadPath = join(__dirname, '../../uploads', filename);
          const stream = createReadStream();
          const writeStream = createWriteStream(uploadPath);
          
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
      uploadFiles: {
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
            
            const uploadPath = join(__dirname, '../../uploads', filename);
            const stream = createReadStream();
            const writeStream = createWriteStream(uploadPath);
            
            stream.pipe(writeStream);
            
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });
            
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
      
      // Upload with additional data
      createPost: {
        type: GraphQLString,
        args: {
          title: { type: new GraphQLNonNull(GraphQLString) },
          content: { type: new GraphQLNonNull(GraphQLString) },
          image: { type: new GraphQLNonNull(GraphQLUpload) },
        },
        async resolve(_, { title, content, image }) {
          const { filename, createReadStream } = await image;
          
          // Save image
          const uploadPath = join(__dirname, '../../uploads', filename);
          const stream = createReadStream();
          const writeStream = createWriteStream(uploadPath);
          
          stream.pipe(writeStream);
          
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          // In a real app, save post data to database
          console.log('Created post:', { title, content, imageUrl: `/uploads/${filename}` });
          
          return `Post "${title}" created with image ${filename}`;
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

// Create H3 handler with custom upload processing
export default defineEventHandler(async (event) => {
  // Handle multipart/form-data uploads
  const contentType = getHeaders(event)['content-type'] || '';
  
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
      setResponseStatus(event, 400);
      return { errors: [{ message: 'Failed to process upload' }] };
    }
  }
  
  // Create the GraphQL handler
  const handler = startServerAndCreateH3Handler(apollo, {
    context: async ({ event }) => ({
      // Add any context here
      headers: getHeaders(event),
    }),
  });
  
  return handler(event);
});