#!/bin/bash

# upload2.sh
# Usage: ./upload2.sh http://localhost:4000/graphql test.png test.png
# Usage: ./upload2.sh http://localhost:4000/graphql test.jpg test.jpg

curl -v -L $1 \
  -H 'Content-Type: multipart/form-data' \
  -F operations='{ "query": "mutation ($file: Upload!, $file2: Upload!) { upload2Files(file: $file, file2: $file2) { uri filename, mimetype, encoding fileSize } }", "variables": { "file": null, "file2": null } }' \
  -F map='{ "0": ["variables.file"], "1": ["variables.file2"] }' \
  -F 0=@$2 \
  -F 1=@$3
