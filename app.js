import express from 'express';
import schema from './graphql-schemas/schema.js';
import resolvers from './graphql-schemas/resolvers.js';
import { graphqlHTTP } from 'express-graphql';



var app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: resolvers,
  graphiql: true,
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');