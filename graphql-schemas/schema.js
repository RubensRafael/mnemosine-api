// Construct a schema, using GraphQL schema language
var typeDefs = `
  
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
      user: ID!
      notes: [Note!]!
      
  
  }
  
  type liteFolder{
      name: String!
      count: Int!
      completedCount: Int!
      uncompletedDates: [String!] 
  }

  type User {
    _id : ID!
    name : String!
    password: String!
    email : String!
    mainFolder: ID!
    mainOrActualFolder(folderId: String = ""): UniqueFolder!

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
  schema{
    query: Query
    mutation: Mutation
  }
`;

export default typeDefs
