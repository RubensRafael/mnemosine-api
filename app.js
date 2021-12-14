import express from 'express';
import { Source, parse, execute, subscribe } from 'graphql'
import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from '@graphql-tools/schema'
import typeDefs from './graphql-schemas/schema.js';
import resolvers from './graphql-schemas/resolvers.js';
import connect from './database.js';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import {WebSocketServer} from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
const port = process.env.PORT || 3000


var app = express();
const executableSchema = makeExecutableSchema({
  typeDefs,
  resolvers
})
       
const loggingMiddleware = async (req, res, next) => {
    console.log("kdkdlskdkdkd")
    res.header("Content-Type",'application/json');

    let src = new Source(String(req.body.query))// Get the query string

    //Parse the string and separe on parts that will be verificated
    let parsed = parse(src)
    let definitionsLength = parsed.definitions.length
    let operation = parsed.definitions[0].operation
    let operationLength = parsed.definitions[0].selectionSet.selections.length
    let operationName = parsed.definitions[0].selectionSet.selections[0].name.value

    // If the query is ONLY 'loginUser' OR ONLY 'createUser', the request pass without jwt verification
    if((operation === 'query') && (operationLength === 1) && (operationName === 'loginUser') && (definitionsLength === 1)){
      next();
    }else if((operation === 'mutation') && (operationLength === 1) && (operationName === 'createUser') && (definitionsLength === 1)){
      next();
    }else{
      //Get jwt token string
      if(res.req.headers.authorization === undefined){
          return res.status(500).send({"errors":[{"message":"Auth header is required."}]})
      }
      let header = req.headers.authorization.split(' ')
      
      if(!(header[0] === "Bearer")){
        //Check the prefix
        return res.status(500).send({"errors":[{"message":"'Bearer' is required"}]})
      }else{
        //Try decode, if an error exits, will be send. Else, the decoded jwt is send by res object
          try {
            let decoded = jwt.verify(header[1], process.env.JWTKEY);
            let user = await connect().then(async (mongodb)=>{
              let users = mongodb.collection("Users")
              return await users.findOne({_id:ObjectId(decoded.id)})
            }).catch((err)=>{
              return res.status(500).send({"errors":[err]})
            })
            if(user === null){return res.status(500).send({"errors":[{"message":"User not exits"}]})}
            res.locals.user = user
            next()
          } catch(err) {
              return res.status(500).send({"errors":[err]})
            }
      }
      
    }  
}


app.use(express.json())
app.post("/graphql",loggingMiddleware)


app.use('/graphql', graphqlHTTP((req, res, params) =>({
  schema: executableSchema,
  context: {user : res.locals.user},
  graphiql : {
    headerEditorEnabled: true
  }
})));

const server = app.listen(port, () => {
    const wsServer = new WebSocketServer({
    server,
    path: '/graphql',
  });
    useServer({ executableSchema }, wsServer);

});
console.log(`Running a GraphQL API server at http://localhost:${port}/graphql`);
