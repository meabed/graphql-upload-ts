# GraphQL Upload with H3 Example

This example demonstrates how to use `graphql-upload-ts` with H3, the minimal HTTP framework that powers Nuxt 3.

## Features

- ✅ File upload support with H3
- ✅ Apollo Server integration
- ✅ Single and multiple file uploads
- ✅ File uploads with additional form data
- ✅ TypeScript support
- ✅ Nitro for development and production builds

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open GraphQL Playground at http://localhost:4000/api/graphql

## GraphQL Operations

### Single File Upload

```graphql
mutation UploadFile($file: Upload!) {
  uploadFile(file: $file) {
    filename
    mimetype
    encoding
    url
  }
}
```

### Multiple File Upload

```graphql
mutation UploadFiles($files: [Upload!]!) {
  uploadFiles(files: $files) {
    filename
    mimetype
    encoding
    url
  }
}
```

### Upload with Additional Data

```graphql
mutation CreatePost($title: String!, $content: String!, $image: Upload!) {
  createPost(title: $title, content: $content, image: $image)
}
```

## Testing with cURL

### Single File Upload

```bash
curl -X POST http://localhost:4000/api/graphql \
  -F operations='{"query":"mutation UploadFile($file: Upload!) { uploadFile(file: $file) { filename mimetype url } }","variables":{"file":null}}' \
  -F map='{"0":["variables.file"]}' \
  -F 0=@./test.jpg
```

### Multiple Files Upload

```bash
curl -X POST http://localhost:4000/api/graphql \
  -F operations='{"query":"mutation UploadFiles($files: [Upload!]!) { uploadFiles(files: $files) { filename url } }","variables":{"files":[null,null]}}' \
  -F map='{"0":["variables.files.0"],"1":["variables.files.1"]}' \
  -F 0=@./test1.jpg \
  -F 1=@./test2.jpg
```

### Upload with Additional Data

```bash
curl -X POST http://localhost:4000/api/graphql \
  -F operations='{"query":"mutation CreatePost($title: String!, $content: String!, $image: Upload!) { createPost(title: $title, content: $content, image: $image) }","variables":{"title":"My Post","content":"Post content","image":null}}' \
  -F map='{"0":["variables.image"]}' \
  -F 0=@./image.jpg
```

## Project Structure

```
h3-example/
├── server/
│   ├── api/
│   │   └── graphql.ts      # GraphQL endpoint with upload handling
│   └── middleware/
│       └── graphql-upload.ts # Upload middleware (optional)
├── uploads/                 # Uploaded files directory
├── nitro.config.ts          # Nitro configuration
├── package.json
└── README.md
```

## Key Implementation Details

1. **H3 Event Handler**: The GraphQL endpoint is implemented as an H3 event handler that processes multipart requests.

2. **Upload Processing**: The `processRequest` function from `graphql-upload-ts` handles the multipart form data parsing.

3. **Apollo Server Integration**: Uses `@as-integrations/h3` to integrate Apollo Server with H3.

4. **File Storage**: Files are saved to the `uploads` directory. In production, you'd typically upload to cloud storage (S3, etc.).

## Production Deployment

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

The built application can be deployed to any Node.js hosting platform that supports H3/Nitro applications, including:
- Vercel
- Netlify
- Cloudflare Workers
- AWS Lambda
- Traditional Node.js servers

## Notes

- The `uploads` directory is created automatically if it doesn't exist
- Maximum file size is set to 10 MB (configurable)
- Maximum number of files per request is 10 (configurable)
- In production, consider adding:
  - File type validation
  - Virus scanning
  - Cloud storage integration
  - Rate limiting
  - Authentication/authorization