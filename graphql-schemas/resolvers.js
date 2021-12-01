import connect from '../database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
dotenv.config()



let db = await connect().then((mongodb)=>{
  return mongodb
})

let users = db.collection("Users")
let folders = db.collection("Folders")
let notes = db.collection("Notes")

// The root provides a resolver function for each API endpoint
var resolvers = {
  Query:{
      
    loginUser : async (root,{email, password},ctx,info) =>{
      //Input Verification
      if(email === undefined || password === undefined){throw Error("Email and password are required!")}

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
      
      console.log(ctx.user)
      return ctx.user
    },
  },
  Mutation:{
    createUser: async (root,{name, email, password},ctx,info) => {
      //Input Verification
      if(email === undefined || password === undefined || name === undefined){throw Error("Name, email and password are required!")}
      // If the email is already registered, throw error
      let savedUser = await users.findOne({email : String(email)})
      
      if(savedUser !== null){throw Error("this email already exits")}
      

      // Create a user with password encrypted
      let newUser = await bcrypt.hash(String(password), 10).then(async (hash)=>{        
        let defaultFolder = await folders.insertOne({name:"My workspace"})
        let result = await users.insertOne({name:String(name),email:String(email),password:String(hash), mainFolder: defaultFolder.insertedId })
        let user = await users.findOne({_id:result.insertedId})
        defaultFolder.user = result.insertedId
        await folders.findOneAndUpdate({_id:defaultFolder.insertedId},{$set: defaultFolder})
        
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
        let savedUser = await users.findOne({email : String(email)})
        
        if(savedUser !== null){throw Error("this email already exits")}
        
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
      let deleted = await users.findOneAndDelete({_id:ObjectId(ctx.user._id)},{projection: {name : 1}}).then((result)=>{
        
        if(result.value){}else{throw Error("Something wrong happened (maybe that user is already deleted), try again.")}
      })
      return true
    },
    createFolder : async (root, {folderName} , ctx, info) =>{
      //Input Verification
      if(folderName === undefined){throw Error("Folder name is required!")}

      let folder = {
        name: String(folderName),
        user: ObjectId(ctx.userId),
      }
      let result = await folders.insertOne(folder)

      return result.insertedId
    },
    updateFolder : async (root, {folderId, newFolderName, toMain} , ctx, info) =>{
      //Input Verification
      if(folderId === undefined){throw Error("The folder Id is required!")}
      if(newFolderName === '' && toMain === false){throw Error("Nothing to update.")}

      let folderModel = {}
      let updatedFolder;
      let user;
      if(newFolderName){

        folderModel.name = String(newFolderName)

        updatedFolder = await folders.findOneAndUpdate({_id: ObjectId(folderId)}, {$set:folderModel}).then(async(result)=>{

        if(result.lastErrorObject.updatedExisting === true){
          return await folders.findOne({_id:ObjectId(folderId)})
        }else{
          throw Error("Something wrong happened, try again.")
        }
        })

      }

      if(toMain){
        user = await users.findOne({_id:ObjectId(ctx.userId)})
        user.mainFolder = folderId
        updatedFolder = await users.findOneAndUpdate({_id:ObjectId(ctx.userId)},{$set:user}).then(async(result)=>{

          if(result.lastErrorObject.updatedExisting === true){
            return await folders.findOne({_id:ObjectId(folderId)})
          }else{
            throw Error("Something wrong happened, try again.")
          }
        })
      }
       

      return updatedFolder
    },
    createNote : async (root, {tile, content, createdAt, expiresIn ,folderId} , ctx, info) =>{
      //Input Verification
      if(title === undefined || content === undefined || createdAt === undefined){throw Error("Title, content and the createdAt are required!")}

      let folder
      let noteModel = {
        title: String(title),
        content: String(content),
        createdAt: String(createdAt),
        expiresIn: String(expiresIn),
        completed: false,
        onwer : ObjectId(ctx.user._id),
        users: [ObjectId(ctx.user._id)],
        folders : []
      }

      if(folderId){
        folder = await folders.findOne({_id:ObjectId(folderId)})
        if(folder === null){throw Error("Folder not found")}
        noteModel.folders.push(ObjectId(folder._id))
      }else{
        
        noteModel.folders.push(ObjectId(ctx.user.mainFolder))
      }
      let result = await notes.insertOne(noteModel)
      let note = await notes.findOne({_id: result.insertedId})
      if(note === null){throw Error("Something wrong happened, try again.")}
      return note
    },
    updateNote : async (root, {noteId, title, content, expiresIn, fromFolder, toFolder, complete, modifiedAt}) =>{
      //check Input
      if(noteId === undefined || modifiedAt=== undefined){throw Error("NoteId and modifiedAt are required")}
      if(title === undefined && content === undefined && expiresIn === undefined && fromFolder === undefined && toFolder === undefined && complete === undefined){throw Error("Nothing to update.")}
      let note = await notes.findOne({_id:ObjectId(noteId),users: ObjectId(ctx.user._id)})
      if(actualNote === null){throw Error("Note not found, or you don't have acess to note")}
      
      
      if(title !== undefined){note
      .title = String(title)}
      if(content !== undefined){note.content = String(content)}
      if(expiresIn !== undefined){note.expiresIn = String(expiresIn)}
      if(complete !== undefined){note.complete = complete}
      if(fromFolder !== undefined && toFolder !== undefined){
        let origin = await folders.findOne({_id:ObjectId(fromFolder), user: ObjectId(ctx.user._id)})
        if(origin === null){throw Error("From folder not found")}
        let destiny = await folders.findOne({_id:ObjectId(toFolder),user: ObjectId(ctx.user._id)})
        if(destiny === null){throw Error("To frolder not found")}
        let originIndex = note.folders.indexOf(origin._id)
        if(originIndex === -1){throw Error("The note doenst in the from folder")}
        note.folders.splice(originIndex, 1, destiny._id)
        
      }
      note.lastModication.when = modifiedAt
      note.lastModication.by = ctx.user.name
      
      let updatedNote = await notes.findOneAndUpdate({_id: note._id},{$set:note}).then(async(result)=>{
        if(result.value){
          return await notes.findOne({_id: note._id})
        }
      })
      return updatedNote
      
    }
    
  },
  User:{
    mainOrActualFolder : async (root, {folderId}, ctx, info)=>{
      let folder
      if(folderId){
        folder = await folders.findOne({_id:ObjectId(folderId)})
        if(folder === null){throw Error("Folder not found")} 
      }else{
        folder = await folders.findOne({_id:ObjectId(ObjectId(root.mainFolder))})
      }
      
      return folder
    },
    folderList: async (root,args,ctx,info)=>{
      let response = [];
      let cursor = await folders.find(user: root._id)
      cursor.forEach((obj)=>{
        let unique = {
        name : obj.name,
        id : obj._id,
        count: 0,
        completed : 0,
        dates : [],
        isMain:false
        }
        let notesCursor = await notes.find({folders:obj._id})
        unique.count = notesCursor.count()
        notesCursor.forEach((obj)=>{
          if(obj.completed === true){
            unique.completed++
          }else{
            unique.dates.push(obj.expiresIn)
          }
          if(obj._id === root.mainFolder){
            unique.isMain = true
          }
        })
        response.push(unique)
      })
      return response
    }
  },
  UniqueFolder:{
    notes : async (root,args,ctx,info) =>{
      let cursor = await notes.find({folders:root._id})
      return cursor.toArray()
    }
  },
  Note: {
    users: async (root,args,ctx,info)=>{
      //logia pra pegar todos
      let cursor  = await users.find({_id:root.users}, {projection:{name:1,email:1}})
      return = cursor.toArray()
    }
  }
};
export default resolvers
