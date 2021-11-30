// Construct a schema, using GraphQL schema language
var typeDefs = `
  
  type Modification{
    when: String!
    by: String!
  }

  type Note{
      title: String!
      content: String!
      createdAt: String!
      expiresIn: String!
      completed: Boolean!
      onwer :User!
      users: [User!]!
      lastModified: Modification
  
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
    createFolder(folderName: String) : ID!
    updateFolder(folderId: String, newFolderName: String = "", toMain: Boolean = false) : UniqueFolder!
    createNote(title: String, content: String, createdAt: String, expiresIn: String = "Never" ,folderId: String = ""): Note!
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
