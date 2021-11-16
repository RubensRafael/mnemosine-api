import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import schema from './graphql-schemas/schema.js';
import resolvers from './graphql-schemas/resolvers.js';

var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: resolvers,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');