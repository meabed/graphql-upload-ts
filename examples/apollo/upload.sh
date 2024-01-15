#!/bin/bash

# upload.sh
# Usage: ./upload.sh http://localhost:4000/graphql test.png

curl -v -L $1 \
  -H 'x-apollo-operation-name: UploadFile' \
  -H 'Apollo-Require-Preflight: true' \
  -F operations='{ "query": "mutation ($file: Upload!) { uploadFile(file: $file) { uri filename mimetype encoding } }", "variables": { "file": null } }' \
  -F map='{ "0": ["variables.file"] }' \
  -F 0=@$2
