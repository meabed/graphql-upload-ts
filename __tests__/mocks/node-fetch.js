// Mock for node-fetch to work with Jest
const nodeFetch = require('node-fetch');
module.exports = nodeFetch.default || nodeFetch;
