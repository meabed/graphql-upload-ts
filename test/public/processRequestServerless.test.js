"use strict";

const { ok, strictEqual, rejects } = require("assert");
const { Readable } = require("stream");
const FormData = require("form-data");
const Upload = require("../../public/Upload");
const processRequest = require("../../public/processRequest");
const streamToString = require("../streamToString");

describe("processRequest serverless", () => {
  it("should throw if headers do not have right content-type", async () => {
    const badContentType = (headerValue) => ({
      name: "BadRequestError",
      message: `Invalid content-type ${headerValue}, should be multipart/form-data;`,
      status: 400,
      expose: true,
    });

    await rejects(processRequest(), badContentType(undefined));
    await rejects(processRequest({}), badContentType(undefined));
    await rejects(processRequest({ headers: null }), badContentType(null));
    await rejects(processRequest({ headers: {} }), badContentType(undefined));
    await rejects(
      processRequest({ headers: { "content-type": null } }),
      badContentType(null)
    );
    await rejects(
      processRequest({ headers: { "content-type": "plain/text" } }),
      badContentType("plain/text")
    );
  });

  it("should throw if GCF request has no .rawBody", async () => {
    const badContentType = (message) => ({
      name: "BadRequestError",
      message,
      status: 400,
      expose: true,
    });

    await rejects(
      processRequest(
        { headers: { "content-type": "multipart/form-data;" } },
        {},
        { environment: "gcf" }
      ),
      badContentType(
        "GCF request.rawBody is missing. See docs: https://cloud.google.com/functions/docs/writing/http#multipart_data"
      )
    );
    await rejects(
      processRequest(
        {
          headers: { "content-type": "multipart/form-data;" },
          rawBody: null,
        },
        {},
        { environment: "gcf" }
      ),
      badContentType(
        "GCF request.rawBody is missing. See docs: https://cloud.google.com/functions/docs/writing/http#multipart_data"
      )
    );
  });

  it("should throw if AWS Lambda event has no .body", async () => {
    const badContentType = (message) => ({
      name: "BadRequestError",
      message,
      status: 400,
      expose: true,
    });

    await rejects(
      processRequest(
        { headers: { "content-type": "multipart/form-data;" } },
        null,
        { environment: "lambda" }
      ),
      badContentType(
        "AWS Lambda request.body is missing. See these screenshots how to set it up: https://github.com/myshenin/aws-lambda-multipart-parser/blob/98ed57e55cf66b2053cf6c27df37a9243a07826a/README.md"
      )
    );
    await rejects(
      processRequest(
        {
          headers: { "content-type": "multipart/form-data;" },
          rawBody: null,
        },
        null,
        { environment: "lambda" }
      ),
      badContentType(
        "AWS Lambda request.body is missing. See these screenshots how to set it up: https://github.com/myshenin/aws-lambda-multipart-parser/blob/98ed57e55cf66b2053cf6c27df37a9243a07826a/README.md"
      )
    );
  });

  it("should throw trying to do serverless in non-serverless environment", async () => {
    const badContentType = (message) => ({
      name: "BadRequestError",
      message,
      status: 400,
      expose: true,
    });

    await rejects(
      processRequest({ headers: { "content-type": "multipart/form-data;" } }),
      badContentType(
        "The request doesn't look like a ReadableStream. Use `environment` option to enable serverless function support."
      )
    );
    await rejects(
      processRequest({
        headers: { "content-type": "multipart/form-data;" },
        rawBody: null,
      }),
      badContentType(
        "The request doesn't look like a ReadableStream. Use `environment` option to enable serverless function support."
      )
    );
  });

  it('`processRequest` with environment="lambda"', async () => {
    const body = new FormData();

    body.append("operations", JSON.stringify({ variables: { file: null } }));
    body.append("map", JSON.stringify({ "1": ["variables.file"] }));
    body.append("1", "a", { filename: "a.txt" });

    // Create a fake Lambda event
    const event = {
      body: body.getBuffer().toString(),
      headers: body.getHeaders(),
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

    // Create a fake Lambda event
    const event = {
      rawBody: body.getBuffer(),
      headers: body.getHeaders(),
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
