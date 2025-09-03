import {
  type ASTNode,
  GraphQLError,
  GraphQLScalarType,
  type GraphQLScalarTypeConfig,
} from 'graphql';
import { Upload } from './Upload';

/**
 * A GraphQL `Upload` scalar that can be used in a GraphQL schema.
 * Its value in resolvers is a promise that resolves to file upload details
 * for processing and storage.
 *
 * @example Import usage
 * ```typescript
 * import { GraphQLUpload } from 'graphql-upload-ts';
 * ```
 *
 * @example Schema usage with GraphQL Tools
 * ```typescript
 * import { makeExecutableSchema } from '@graphql-tools/schema';
 * import { GraphQLUpload } from 'graphql-upload-ts';
 *
 * const schema = makeExecutableSchema({
 *   typeDefs: `
 *     scalar Upload
 *
 *     type Mutation {
 *       uploadFile(file: Upload!): Boolean
 *     }
 *   `,
 *   resolvers: {
 *     Upload: GraphQLUpload,
 *     Mutation: {
 *       uploadFile: async (_, { file }) => {
 *         const { filename, mimetype, createReadStream } = await file;
 *         const stream = createReadStream();
 *         // Process the file stream...
 *         return true;
 *       }
 *     }
 *   },
 * });
 * ```
 */
const uploadScalarConfig: GraphQLScalarTypeConfig<Upload['promise'], never> = {
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',

  parseValue(value: unknown): Upload['promise'] {
    if (value instanceof Upload) {
      return value.promise;
    }
    throw new GraphQLError('Upload value invalid. Expected Upload instance.', {
      extensions: { code: 'INVALID_UPLOAD_VALUE' },
    });
  },

  parseLiteral(node: ASTNode): never {
    throw new GraphQLError('Upload literal unsupported. Uploads can only be passed as variables.', {
      nodes: node,
      extensions: { code: 'UPLOAD_LITERAL_UNSUPPORTED' },
    });
  },

  serialize(): never {
    throw new GraphQLError('Upload serialization unsupported. Uploads cannot be serialized.', {
      extensions: { code: 'UPLOAD_SERIALIZATION_UNSUPPORTED' },
    });
  },
};

export const GraphQLUpload = new GraphQLScalarType(uploadScalarConfig);
