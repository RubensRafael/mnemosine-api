import { buildSchema } from 'graphql';

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  type User {
    _id : ID!
    name : String!
    password: String!
    email : String!

  }
  type Note{
      title: String!
      content: String!
      completed: Boolean!
      expiresIn: String!
      users: [User!]!
      lastModified: String!
  
  }
  
  type UniqueFolder{
      _id: ID!
      name: String!
      isMain: Boolean!
      notes: [Note!]!
  
  }
  
  type liteFolder{
      name: String!
      count: Int!
      completedCount: Int!
      uncompletedDates: [String!] 
  }

  type Mutation {
    createUser(name: String, email: String, password: String) : String!
    updateUser(name: String = "", email: String = "", password: String = "") : User!
    deleteUser : Boolean!
  }

  type Query {
    loginUser(email: String, password: String) : String!
    teste: User!
  }
`);

export default schema
