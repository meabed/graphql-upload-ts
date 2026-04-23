#!/bin/bash

# upload.sh
# Usage: ./upload.sh http://localhost:4000/graphql test.png
# Usage: ./upload.sh http://localhost:4000/graphql test.jpg

curl -v -L $1 \
  -H 'Content-Type: multipart/form-data' \
  -F operations='{ "query": "mutation ($file: Upload!) { uploadFile(file: $file) { uri filename mimetype encoding fileSize } }", "variables": { "file": null } }' \
  -F map='{ "0": ["variables.file"] }' \
  -F 0=@$2


# call query hello
#curl $1 \
#  -H 'Content-Type: application/json' \
#  -d '{"query":"query { hello }"}'
