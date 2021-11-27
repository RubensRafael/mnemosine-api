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
let folders = db.collection("Folders")

// The root provides a resolver function for each API endpoint
var resolvers = {

  Query:{
      
    loginUser : async (root,{email, password},ctx,info) =>{
      // get user by email
      let user = await users.findOne({email : String(email)}, {projection: {_id : 1, password : 1}})

      // if user not found
      if(user === null){throw Error("The email or the password is wrong.")}

      //Compare password encrypted
      await bcrypt.compare(password, user.password).then((result)=>{
        if(result === false){throw Error("The email or the password is wrong.")}
      })
      // Create a jwt token, with the user Id
      let jwtToken = jwt.sign({id : user._id}, process.env.JWTKEY, {expiresIn: "3 days"})

      return jwtToken //send token
    },
    teste : async (root, args, ctx, info)=>{
      
      let user = await users.findOne({_id:ObjectId(ctx.userId)})
      return user
    },
  },
  Mutation:{
    createUser: async (root,{name, email, password},ctx,info) => {

      // If the email is already registered, throw error
      let cursor = await users.find({email : String(email)})
      let list = await cursor.toArray()
      if(list.length > 0){throw Error("this email already exits")}
      await cursor.close()// Close cursor

      // Create a user with password encrypted
      let newUser = await bcrypt.hash(String(password), 10).then(async (hash)=>{
        console.log('a')
        //,folders: [{name: "My workspace", isMain: true, notes: []}]
        let defaultFolder = await folders.insertOne({name:"My workspace", notes: []})
        let result = await users.insertOne({name:String(name),email:String(email),password:String(hash), mainFolder: defaultFolder.insertedId })
        let user = await users.findOne({_id:result.insertedId})
        defaultFolder.user = result.insertedId
        console.log(defaultFolder)
        await folders.findOneAndUpdate({_id:defaultFolder.insertedId},{$set: defaultFolder})
        console.log(user)
        return user
      })
      // Create a jwt token, with the user Id
      let jwtToken = jwt.sign({id : newUser._id}, process.env.JWTKEY, {expiresIn: "3 days"})

      
      return jwtToken //send token
    },
    updateUser : async (root,{name, email, password},ctx, info) =>{
      
      let updateSetter = {};
      // Build update object based on args.
      // If the args exits, crate the propriety
      // Special checks in the email and password fields is necessary
      if(name){updateSetter.name = name}
      if(email){
        let cursor = await users.find({email : String(email)})
        let list = await cursor.toArray()
        if(list.length > 0){throw Error("this email already exits")}
        await cursor.close()
        updateSetter.email = email
      }
      if(password){
        updateSetter.password = await bcrypt.hash(String(password), 10).then((hash)=>{
          return hash
        })
      }
      // update user based on jwt token provided by ctx, with sucess, return the updated user.
      let updatedUser = await users.findOneAndUpdate({_id:ObjectId(ctx.userId)},{$set: updateSetter }).then(async(result)=>{
        
        if(result.lastErrorObject.updatedExisting === true){
          return await users.findOne({_id:ObjectId(ctx.userId)})
        }else{
          throw Error("Something wrong happened, try again.")
        }
      })  
      return updatedUser
    },
    deleteUser : async (root, args, ctx, info)=>{
      // delete user based on jwt token provided by ctx, with sucess, return true.
      let deleted = await users.findOneAndDelete({_id:ObjectId(ctx.userId)},{name : 1}).then((result)=>{
        
        if(result.value){}else{throw Error("Something wrong happened (maybe that user is already deleted), try again.")}
      })
      return true
    },

  },
  User:{
    mainOrActualFolder : async (root, {folderId}, ctx, info)=>{
      
      let folder
      if(folderId){
        folder = await folders.findOne({_id:ObjectId(folderId)})   
      }else{
        folder = await folders.findOne({_id:ObjectId(root.mainFolder)})
      }
      
      return folder
    },
  }
};
export default resolvers
