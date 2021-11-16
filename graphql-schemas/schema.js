import { buildSchema } from 'graphql';

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type User {
    _id : ID!
    name : String!
    password: String!
    email : String!

  }

  type Mutation {
    createUser(name: String, email: String, password: String) : String!
  }

  type Query {
    loginUser(email: String, password: String) : String!
  }
`);

export default schema