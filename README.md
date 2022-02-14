# Mnemosine

Api de um app de anotações feita com graphql, consumida pelo app front-end [Mnemosine](https://github.com/RubensRafael/Mnemosine).
MongoDB foi usado como banco de dados, e a autenticação foi feita com json web token, se quiser saber mais sobre como construir um sistema de login jwt no graphql, eu fiz um artigo sobre isso, que você pode encontrar [aqui](https://medium.com/@rubensrafael2/como-implementar-um-sistema-de-login-efetivo-baseado-em-json-web-token-com-express-graphql-d14866608827).

```

type Modification{
    when: String
    by: String
  }
  type Note{
      _id: ID!
      title: String!
      content: String!
      createdAt: String!
      expiresIn: String
      completed: Boolean!
      owner : ID!
      users: [LiteUser!]!
      lastModification: Modification
      folders: [String!]!
  
  }
  
  type UniqueFolder{
      _id: ID!
      name: String!
      user: ID!
      notes: [Note!]!
      
  
  }
  
  type liteFolder{
      _id: ID!
      name: String!
      count: Int!
      completed: Int!
      dates: [String!]!
      isMain: Boolean!
  }
  
  type LiteUser{
    _id: ID!
    name: String!
    email: String!
  }
  
  
  type User {
    _id : ID!
    name : String!
    password: String!
    email : String!
    mainFolder: ID!
    mainOrActualFolder(folderId: String): UniqueFolder!
    folderList: [liteFolder!]!
  }
  
  
  type Invite{
    _id: ID
    from: ID
    to: ID
    note: ID
    response: Boolean
  }
  
  type Mutation {
    createUser(name: String, email: String, password: String) : String!
    updateUser(name: String = "", email: String = "", password: String = "") : User!
    deleteUser : Boolean!
    createFolder(folderName: String) : UniqueFolder!
    updateFolder(folderId: String, newFolderName: String = "", toMain: Boolean = false) : UniqueFolder!
    createNote(title: String, content: String, createdAt: String, expiresIn: String = "Never" ,folderId: String = ""): Note!
    updateNote(noteId: String, title: String, content: String, expiresIn: String, fromFolder: String, toFolder: String, complete: Boolean, modifiedAt: String): Note!
    deleteTarget(level: Int, targetId: String): [Boolean!]!
    createInvite(noteId: String, to: String): [Int!]!
    responseInvite(inviteId: String, response: Boolean): Boolean!
  }
  
  
  type Query {
    loginUser(email: String, password: String) : String!
    getOneNote(noteId: String): Note
    getUser: User!
  }
  
  
  type Subscription{
    newInvite : Invite!
    answeredInvite : Invite!
  }
  
```
