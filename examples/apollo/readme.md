## Apollo Server Graphql Upload Example

This example shows how to use `graphql-upload-ts` with [Apollo Server](https://www.apollographql.com/docs/apollo-server/).

### Usage

```bash
# Install dependencies
yarn install

# Start the server
yarn start

# Test upload with cURL ( successful upload as server accept only mime type image/png)
./upload.sh http://localhost:4000/graphql test.png

# Test upload with cURL ( failed upload / throw exception as server reject mime type image/jpeg)
./upload.sh http://localhost:4000/graphql test.jpg

```
### OR Open http://localhost:4000/graphql in a browser to use GraphQL Playground
#### and run the `uploadFile` mutation with the `test.png` file as images below

![Upload File Mutation1](./screenshot/img1.png)
![Upload File Mutation2](./screenshot/img2.png)
