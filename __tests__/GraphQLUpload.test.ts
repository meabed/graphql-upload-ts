import { GraphQLUpload, Upload } from '../src';
import { doesNotThrow, throws } from 'assert';
import { parseValue } from 'graphql';

describe('GraphQLUpload', () => {
  it('`GraphQLUpload` scalar `parseValue` with a valid value.', () => {
    doesNotThrow(() => {
      GraphQLUpload.parseValue(new Upload());
    });
  });

  it('`GraphQLUpload` scalar `parseValue` with an invalid value.', () => {
    throws(
      () => {
        GraphQLUpload.parseValue(true);
      },
      {
        name: 'GraphQLError',
        message: 'Upload value invalid.',
      },
    );
  });

  it('`GraphQLUpload` scalar `parseLiteral`.', () => {
    throws(
      () => {
        // The dummy value is irrelevant.
        GraphQLUpload.parseLiteral(parseValue('""'));
      },
      {
        name: 'GraphQLError',
        message: 'Upload literal unsupported.',
        locations: [{ line: 1, column: 1 }],
      },
    );
  });

  it('`GraphQLUpload` scalar `serialize`.', () => {
    throws(
      () => {
        // The dummy value is irrelevant.
        GraphQLUpload.serialize('');
      },
      {
        name: 'GraphQLError',
        message: 'Upload serialization unsupported.',
      },
    );
  });
});
