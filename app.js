import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import schema from './graphql-schemas/schema.js';
import resolvers from './graphql-schemas/resolvers.js';
const port = process.env.PORT || 3000

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: resolvers,
  graphiql: true,
}));
app.listen(port);
console.log('Running a GraphQL API server at http://localhost:' + port +'/graphql');