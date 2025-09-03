import { doesNotThrow, throws } from 'node:assert';
import { parseValue } from 'graphql';
import { GraphQLUpload, Upload } from '../src';

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
        message: 'Upload value invalid. Expected Upload instance.',
      }
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
        message: 'Upload literal unsupported. Uploads can only be passed as variables.',
      }
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
        message: 'Upload serialization unsupported. Uploads cannot be serialized.',
      }
    );
  });
});
