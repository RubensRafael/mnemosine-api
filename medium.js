var express = require('express');
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');
import { Source, parse } from 'graphql'

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
type User{
id: ID!
name: String!
password: String!
email: String!
}
type Mutation {
createUser(name: String, password: String, email: String): String!
}
type Query{
loginUser(email: String, password: String): String!
getName: String!
}
`);

// The root provides a resolver function for each API endpoint
var root = {
createUser: (root, args, context, info) => {
	//bcrypt receive a String to hash and one Number, more information on documentation.
	let user = await bcrypt.hash(args.password, 10).then(async (hash)=>{
		// your db action goes here
		let newUser = yourDB.create(args.name, hash, args.email)
		// returning user to variable
		return user
	}

	let token = jwt.sign({id : newUser._id}, process.env.JWTKEY, {expiresIn: "3 days"})
	return token;
},
loginUser: (root, args, context, info) => {
	let fromDbUser = yourDB.find({email : args.email})

	//bcrypt give one boolean value, when copare our two passwords.
	// if both is compatibles, return true
	//else, return false
	await bcrypt.compare(args.password, fromDbUser.password).then((result)=>{
        if(result === false){throw Error("The email or the password is wrong.")}
    })
    // if no error happens, the code keep running.

    let token = jwt.sign({id : newUser._id}, process.env.JWTKEY, {expiresIn: "3 days"})
	return token;

},
getName: (root, args, context, info) => {
	
	let user = yourDB.find({id: context.userId})
	return user.name
},
};

const loggingMiddleware = async (req, res, next) => {

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
		let decoded = jwt.verify(req.headers.authorization, process.env.JWTKEY);
		res.locals.userId = decoded.id
		next()
	}
}

var app = express();
app.use(express.json())
app.use(loggingMiddleware)
app.use('/graphql', graphqlHTTP({
schema: schema,
rootValue: root,
context: {userId : res.locals.userId},
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');