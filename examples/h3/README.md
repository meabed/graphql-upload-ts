## H3 Server GraphQL Upload Example

This example shows how to use `graphql-upload-ts` with [H3](https://h3.unjs.io/) - the minimal HTTP framework that powers Nuxt 3.

### Usage

```bash
# Install dependencies
yarn install

# Start the server
yarn start

# Or run in development mode with auto-reload
yarn dev

# Test upload with cURL (successful upload as server accepts only mime type image/png)
./upload.sh http://localhost:4000/graphql test.png

# Test upload with cURL (failed upload / throw exception as server rejects mime type image/jpeg)
./upload.sh http://localhost:4000/graphql test.jpg

```

### OR Open http://localhost:4000/graphql in a browser to use GraphQL Playground
#### and run the `uploadFile` mutation with the `test.png` file

### Key Features

- ✅ File upload validation (only accepts PNG images like other examples)
- ✅ Apollo Server integration with H3
- ✅ Minimal setup with TypeScript support
- ✅ Consistent with other example implementations

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

#### Test Query
```graphql
query {
  hello
}
```

### Project Structure
```
h3/
├── index.ts         # Main server file
├── upload.sh        # Test script for file uploads
├── test.png         # Test PNG image (valid)
├── test.jpg         # Test JPEG image (invalid - for testing rejection)
├── uploads/         # Directory for uploaded files
├── package.json
├── tsconfig.json
└── README.md
```