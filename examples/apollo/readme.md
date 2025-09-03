## Apollo Server GraphQL Upload Example

This example shows how to use `graphql-upload-ts` with [Apollo Server](https://www.apollographql.com/docs/apollo-server/) v4.

### Usage

```bash
# Install dependencies
yarn install

# Start the server
yarn start

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

- ✅ Apollo Server v4 with Express integration
- ✅ File upload validation (only accepts PNG images)
- ✅ Proper multipart form data handling
- ✅ TypeScript support with strict typing
- ✅ GraphQL Playground for testing

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
apollo/
├── index.ts         # Main server file with Apollo Server setup
├── upload.sh        # Test script for file uploads
├── test.png         # Test PNG image (valid)
├── test.jpg         # Test JPEG image (invalid - for testing rejection)
├── uploads/         # Directory for uploaded files
├── screenshot/      # GraphQL Playground screenshots
├── package.json
├── tsconfig.json
└── README.md
```

### Implementation Details

- Uses `graphqlUploadExpress` middleware for handling multipart requests
- Validates uploaded files using `validateMimeType` utility
- Returns file metadata including URI, filename, mimetype, encoding, and file size
- Proper error handling for invalid file types
