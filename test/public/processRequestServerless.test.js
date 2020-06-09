"use strict";

const { ok, strictEqual } = require("assert");
const { Readable } = require("stream");
const FormData = require("form-data");
const Upload = require("../../public/Upload");
const processRequest = require("../../public/processRequest");
const streamToString = require("../streamToString");

describe("processRequest serverless", () => {
  it('`processRequest` with environment="lambda"', async () => {
    const body = new FormData();

    body.append("operations", JSON.stringify({ variables: { file: null } }));
    body.append("map", JSON.stringify({ "1": ["variables.file"] }));
    body.append("1", "a", { filename: "a.txt" });

    const headers = body.getHeaders();
    const values = body.getBuffer().toString();

    // Create a fake Lambda event
    const event = {
      body: values,
      headers,
    };

    const operation = await processRequest(event, null, {
      environment: "lambda",
    });

    ok(operation.variables.file instanceof Upload);

    const upload = await operation.variables.file.promise;

    strictEqual(upload.filename, "a.txt");
    strictEqual(upload.mimetype, "text/plain");
    strictEqual(upload.encoding, "7bit");

    const stream = upload.createReadStream();

    ok(stream instanceof Readable);
    strictEqual(stream._readableState.encoding, null);
    strictEqual(stream.readableHighWaterMark, 16384);
    strictEqual(await streamToString(stream), "a");
  });

  it('`processRequest` with environment="gcf"', async () => {
    const body = new FormData();

    body.append("operations", JSON.stringify({ variables: { file: null } }));
    body.append("map", JSON.stringify({ "1": ["variables.file"] }));
    body.append("1", "a", { filename: "a.txt" });

    const headers = body.getHeaders();
    const values = body.getBuffer().toString();

    // Create a fake Lambda event
    const event = {
      rawBody: values,
      headers,
    };

    const operation = await processRequest(event, null, {
      environment: "gcf",
    });

    ok(operation.variables.file instanceof Upload);

    const upload = await operation.variables.file.promise;

    strictEqual(upload.filename, "a.txt");
    strictEqual(upload.mimetype, "text/plain");
    strictEqual(upload.encoding, "7bit");

    const stream = upload.createReadStream();

    ok(stream instanceof Readable);
    strictEqual(stream._readableState.encoding, null);
    strictEqual(stream.readableHighWaterMark, 16384);
    strictEqual(await streamToString(stream), "a");
  });
});
