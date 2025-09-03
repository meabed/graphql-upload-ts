import { defineEventHandler, readBody, getHeaders } from 'h3';
import { processRequest } from 'graphql-upload-ts';

// Middleware to handle GraphQL uploads
export default defineEventHandler(async (event) => {
  // Only process GraphQL endpoint
  if (!event.node.req.url?.startsWith('/api/graphql')) {
    return;
  }

  const contentType = getHeaders(event)['content-type'] || '';
  
  // Only process multipart requests
  if (!contentType.includes('multipart/form-data')) {
    return;
  }

  try {
    // Process the multipart request
    const processedBody = await processRequest(event.node.req, event.node.res, {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 10,
    });
    
    // Store the processed body for the GraphQL handler
    event.context.uploadBody = processedBody;
  } catch (error) {
    console.error('Upload middleware error:', error);
    throw error;
  }
});