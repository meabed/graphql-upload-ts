## Express Server GraphQL Upload Example

This example shows how to use `graphql-upload-ts` with [Express](https://expressjs.com/) and different GraphQL server implementations.

### Usage

```bash
# Install dependencies
yarn install

# Start the server with `graphql-http` library
yarn start:graphql-http

# Or start the server with `graphql-yoga` library
yarn start:graphql-yoga

# Test upload with cURL (successful upload as server accepts only mime type image/png)
./upload.sh http://localhost:4000/graphql test.png

# Test upload with cURL (failed upload / throws exception as server rejects mime type image/jpeg)
./upload.sh http://localhost:4000/graphql test.jpg

```

### OR Open http://localhost:4000/graphql in a browser to use GraphQL Playground
#### and run the `uploadFile` mutation with the `test.png` file as shown in images below

![Upload File Mutation1](./screenshot/img1.png)
![Upload File Mutation2](./screenshot/img2.png)

### Key Features

- ✅ Express server with two GraphQL library options
- ✅ Support for both `graphql-http` and `graphql-yoga`
- ✅ File upload validation (only accepts PNG images)
- ✅ Multiple file upload support (with `upload2.sh`)
- ✅ TypeScript support with strict typing
- ✅ GraphQL Playground/GraphiQL for testing

### GraphQL Operations

#### Upload File Mutation
```graphql
mutation UploadFile($file: Upload!) {
  uploadFile(file: $file) {
    uri
    filename
    mimetype
    encoding
    fileSize
  }
}
```

#### Upload Multiple Files Mutation
```graphql
mutation UploadFiles($files: [Upload!]!) {
  uploadFiles(files: $files) {
    uri
    filename
    mimetype
    encoding
    fileSize
  }
}
```

#### Test Query
```graphql
query {
  hello
}
```

### Project Structure
```
express/
├── graphql-http.ts  # Server implementation using graphql-http
├── graphql-yoga.ts  # Server implementation using GraphQL Yoga
├── upload.sh        # Test script for single file upload
├── upload2.sh       # Test script for multiple file uploads
├── test.png         # Test PNG image (valid)
├── test.jpg         # Test JPEG image (invalid - for testing rejection)
├── 2814.png         # Additional test image
├── 6127.png         # Additional test image
├── uploads/         # Directory for uploaded files
├── package.json
├── tsconfig.json
└── README.md
```

### Implementation Comparison

#### graphql-http
- Uses the official `graphql-http` library from GraphQL.js
- Minimal setup with Express
- GraphiQL interface included

#### GraphQL Yoga
- Uses GraphQL Yoga for a more feature-rich experience
- Built-in GraphQL Playground
- Additional features like subscriptions support

### Implementation Details

- Uses `graphqlUploadExpress` middleware for handling multipart requests
- Validates uploaded files using `validateMimeType` utility
- Returns file metadata including URI, filename, mimetype, encoding, and file size
- Supports both single and multiple file uploads
- Proper error handling for invalid file types
