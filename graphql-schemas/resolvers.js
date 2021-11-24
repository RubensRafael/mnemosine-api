import dotenv from 'dotenv';
import connect from '../database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

dotenv.config()



let db = await connect().then((mongodb)=>{
  return mongodb
})

let users = db.collection("Users")

// The root provides a resolver function for each API endpoint
var resolvers = {
  createUser: async ({name, email, password}) => {

    let cursor = await users.find({email : String(email)})
    let list = await cursor.toArray()
    if(list.length > 0){throw Error("this email already exits")}

    let newUser = await bcrypt.hash(String(password), 10).then(async (hash)=>{
      let result = await users.insertOne({name:String(name),email:String(email),password:String(hash)})
      let user = await users.findOne({_id:result.insertedId})
      return user
    })
    
    let jwtToken = jwt.sign({id : newUser._id}, process.env.JWTKEY, {expiresIn: "3 days"})
    await cursor.close()
    return jwtToken
  },
  loginUser : async ({email, password}) =>{

    let user = await users.findOne({email : String(email)}, {_id : 1, password : 1})
    
    if(user === null){throw Error("The email or the password is wrong.")}
    await bcrypt.compare(password, user.password).then((result)=>{
      if(result === false){throw Error("The email or the password is wrong.")}
    })
    let jwtToken = jwt.sign({id : user._id}, process.env.JWTKEY, {expiresIn: "3 days"})
    return jwtToken    
  },
  updateUser : async ({name, email, password},context) =>{
    
    let updateSetter = {};

    if(name !== ''){updateSetter.name = name}
    if(email !== ''){
      let cursor = await users.find({email : String(email)})
      let list = await cursor.toArray()
      if(list.length > 0){throw Error("this email already exits")}
      await cursor.close()
      updateSetter.email = email
    }
    if(password !== ''){
      updateSetter.password = await bcrypt.hash(String(password), 10).then((hash)=>{
        return hash
      })
    }
    
    let updatedUser = await users.findOneAndUpdate({_id:ObjectId(context.userId)},{$set: updateSetter }).then(async(result)=>{
      
      if(result.lastErrorObject.updatedExisting === true){
        return await users.findOne({_id:ObjectId(context.userId)})
      }else{
        throw Error("Something wrong happened, try again.")
      }
    })  
    return updatedUser
  },
  teste : async ({}, context)=>{
    console.log(typeof context.userId)

    let user = await users.findOne({_id:context.userId})
    
    return user
  }
};
export default resolvers
/*jwt.verify(token, 'wrong-secret', function(err, decoded) {
  // err 
  // decoded undefined
});*/