import express from 'express';
import { Source, parse } from 'graphql'
import { graphqlHTTP } from 'express-graphql';
import schema from './graphql-schemas/schema.js';
import resolvers from './graphql-schemas/resolvers.js';
import jwt from 'jsonwebtoken';
const port = process.env.PORT || 3000


var app = express();


const loggingMiddleware = (req, res, next) => {

    let src = new Source(String(req.body.query))
    let parsed = parse(src)
    let operation = parsed.definitions[0].operation
    let operationLength = parsed.definitions[0].selectionSet.selections.length
    let operationName = parsed.definitions[0].selectionSet.selections[0].name.value

    if((operation === 'query') && (operationLength === 1) && (operationName === 'loginUser')){
      next();
    }else if((operation === 'mutation') && (operationLength === 1) && (operationName === 'createUser')){
      next();
    }else{
      let header = req.headers.authorization.split(' ')
      if(!(header[0] === "Bearer")){
        res.send({"errors":[{"message":"'Bearer' is required"}]})
      }else{
          try {
            let decoded = jwt.verify(header[1], process.env.JWTKEY);
            res.locals.userId = decoded.id
            next()
          } catch(err) {
              res.send({"errors":[err]})
            }
      }
      
    }
    

    
      
  
}

app.use(function (req, res, next) {
  res.header("Content-Type",'application/json');
  next();
});

app.use(express.json())
app.use(loggingMiddleware)


app.use('/graphql', graphqlHTTP((req, res, params) =>({
  schema: schema,
  rootValue: resolvers,
  context: {userId : res.locals.userId}
  //graphiql: true,
})));
app.listen(port);
console.log('Running a GraphQL API server at http://localhost:' + port +'/graphql');