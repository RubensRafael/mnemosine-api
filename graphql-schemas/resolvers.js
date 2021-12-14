import connect from '../database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import  { PubSub } from 'graphql-subscriptions';
dotenv.config()

let pubsub = new PubSub()

let db = await connect().then((mongodb)=>{
  return mongodb
})

let users = db.collection("Users")
let folders = db.collection("Folders")
let notes = db.collection("Notes")
let invitations = db.collection("Invitations")

async function deleteNotes(note,user){

        if(note === null){throw Error("Note Not Found.")}
        if(String(note.owner) === String(user._id)){
          let deleteCheck = await notes.findOneAndDelete(note).then((result)=>{return result.value})
          return deleteCheck ? true : false
        }else{
          let index = String(note.users).split(',').indexOf(String(user._id))
          note.users.splice(index,1)
          let updateCheck = await notes.findOneAndUpdate({_id: note._id},{$set:note}).then((result)=>{return result.value})
          return updateCheck ? true : false
        }
}

// The root provides a resolver function for each API endpoint
var resolvers = {
  Query:{
      
    loginUser : async (root,{email, password},ctx,info) =>{
      //Input Verification
      if(email === undefined || password === undefined){throw Error("'email' and 'password' are required!")}

      // get user by email
      let user = await users.findOne({email : String(email)}, {projection: {_id : 1, password : 1}})
      

      // if user not found
      if(user === null){throw Error("The 'email' or the 'password' is wrong.")}

      //Compare password encrypted
      await bcrypt.compare(password, user.password).then((result)=>{
        if(result === false){throw Error("The 'email' or the 'password' is wrong.")}
      })
      // Create a jwt token, with the user Id
      let jwtToken = jwt.sign({id : user._id}, process.env.JWTKEY, {expiresIn: "3 days"})

      return jwtToken //send token
    },
    getOneNote:async (root,{noteId},ctx,info)=>{
      let note = await notes.findOne({_id:ObjectId(noteId)})
      return note
    },
    getUser : async (root, args, ctx, info)=>{
      return ctx.user
    },

  },
  Mutation:{
    createUser: async (root,{name, email, password},ctx,info) => {
      //Input Verification
      if(email === undefined || password === undefined || name === undefined){throw Error("'name', 'email' and 'password' are required!")}
      // If the email is already registered, throw error
      let savedUser = await users.findOne({email : String(email)})
      
      if(savedUser !== null){throw Error("This email already exits.")}
      

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
        
        if(savedUser !== null){throw Error("This email already exits.")}
        
        updateSetter.email = email
      }
      if(password){
        updateSetter.password = await bcrypt.hash(String(password), 10).then((hash)=>{
          return hash
        })
      }
      // update user based on jwt token provided by ctx, with sucess, return the updated user.
      let updatedUser = await users.findOneAndUpdate({_id:ctx.user._id},{$set: updateSetter }).then(async(result)=>{
        
        if(result.lastErrorObject.updatedExisting === true){
          return await users.findOne({_id:ctx.user._id})
        }else{
          throw Error("Something wrong happened, try again.")
        }
      })  
      return updatedUser
    },
    createFolder : async (root, {folderName} , ctx, info) =>{
      //Input Verification
      if(folderName === undefined){throw Error("'folderName' is required!")}

      let folder = {
        name: String(folderName),
        user: ObjectId(ctx.user._id),
      }
      let result = await folders.insertOne(folder)
      let response = await folders.findOne({_id:result.insertedId})

      return response
    },
    updateFolder : async (root, {folderId, newFolderName, toMain} , ctx, info) =>{
      //Input Verification
      if(folderId === undefined){throw Error("'folderId' is required!")}
      if(newFolderName === '' && toMain === false){throw Error("Nothing to update.")}

      let folder = await folders.findOne({_id:ObjectId(folderId),user: ctx.user._id})
      if(folder === null){throw Error("Folder Not Found.")}
      
      let updatedFolder;
      let user;
      if(newFolderName){

        folder.name = String(newFolderName)

        updatedFolder = await folders.findOneAndUpdate({_id: ObjectId(folderId)}, {$set:folder}).then(async(result)=>{

        if(result.lastErrorObject.updatedExisting === true){
          return await folders.findOne({_id:ObjectId(folderId)})
        }else{
          throw Error("Something wrong happened, try again.")
        }
        })

      }

      if(toMain){

        user = await users.findOne({_id:ctx.user._id})
        user.mainFolder = ObjectId(folderId)
        await users.findOneAndUpdate({_id:ctx.user._id},{$set:user}).then(async(result)=>{

          if(result.lastErrorObject.updatedExisting === true){
            //pass
          }else{
            throw Error("Something wrong happened, try again.")
          }
        })

      }
       
      let response = updatedFolder === undefined ? folder : updatedFolder
      return response
    },
    createNote : async (root, {title, content, createdAt, expiresIn ,folderId} , ctx, info) =>{
      //Input Verification
      if(title === undefined || content === undefined || createdAt === undefined){throw Error("'title', 'content' and 'createdAt' are required!")}

      let folder
      let noteModel = {
        title: String(title),
        content: String(content),
        createdAt: String(createdAt),
        expiresIn: String(expiresIn),
        completed: false,
        owner : ObjectId(ctx.user._id),
        users: [ObjectId(ctx.user._id)],
        folders : []
      }

      if(folderId){
        folder = await folders.findOne({_id:ObjectId(folderId)})
        if(folder === null){throw Error("Folder not found.")}
        noteModel.folders.push(ObjectId(folder._id))
      }else{
        
        noteModel.folders.push(ObjectId(ctx.user.mainFolder))
      }
      let result = await notes.insertOne(noteModel)
      let note = await notes.findOne({_id: result.insertedId})
      if(note === null){throw Error("Something wrong happened, try again.")}
      return note
    },
    updateNote : async (root, {noteId, title, content, expiresIn, fromFolder, toFolder, complete, modifiedAt},ctx,info) =>{
      //check Input
      if(noteId === undefined || modifiedAt === undefined){throw Error("'noteId' and 'modifiedAt' are required.")}
      if(title === undefined && content === undefined && expiresIn === undefined && fromFolder === undefined && toFolder === undefined && complete === undefined){throw Error("Nothing to update.")}
      let note = await notes.findOne({_id:ObjectId(noteId),users: ctx.user._id})
      if(note === null){throw Error("Note not found, or you don't have acess to note.")}
      
      
      if(title !== undefined){note.title = String(title)}
      if(content !== undefined){note.content = String(content)}
      if(expiresIn !== undefined){note.expiresIn = String(expiresIn)}
      if(complete !== undefined){note.completed = complete}
      if(fromFolder !== undefined && toFolder !== undefined){
        let origin = await folders.findOne({_id:ObjectId(fromFolder), user: ctx.user._id})
        if(origin === null){throw Error("'fromFolder' not found.")}
        let destiny = await folders.findOne({_id:ObjectId(toFolder),user: ctx.user._id})
        if(destiny === null){throw Error("'toFolder' not found")}
        let originIndex = String(note.folders).split(',').indexOf(String(origin._id))
        
        if(originIndex === -1){throw Error("The note don't is present on this folder.")}
        note.folders.splice(originIndex, 1, destiny._id)
        
        
      }
      note.lastModification = {}
      note.lastModification.when = modifiedAt
      note.lastModification.by = ctx.user.name
      
      let updatedNote = await notes.findOneAndUpdate({_id: note._id},{$set:note}).then(async(result)=>{
        if(result.value){
          return await notes.findOne({_id: note._id})
        }
      })
      return updatedNote
    },
    deleteTarget: async (root,{level,targetId},ctx,info)=>{
      let response;
      if(level === 1){

        let note = await notes.findOne({_id: ObjectId(targetId), users: ctx.user._id})

        return [deleteNotes(note,ctx.user)]

      }else if(level === 2){
        let folder = await folders.findOne({_id: ObjectId(targetId), user: ctx.user._id})
        if(folder === null){throw Error("Folder not found.")}
        if(String(folder._id) === String(ctx.user.mainFolder)){throw Error("You can't delete your main folder.")}
        let level1 = false;
        let level2 = false;

        let notesCursor = await notes.find({folders: folder._id})

        let notesArray = await notesCursor.toArray()
        await notesCursor.close()
        level1 = notesArray.map((obj)=>{
            return deleteNotes(obj,ctx.user)
        })
        

        if(!(level1.includes(false))){
          level1 = true
          level2 = await folders.findOneAndDelete(folder).then((result)=>{return result.value ? true :false})
        }

        return [level1, level2]

        }else if(level === 3){
          let level1 = false
          let level2 = false
          let level3 = false
          let notesCursor = await notes.find({users: ctx.user._id})

          let notesArray = await notesCursor.toArray()
          await notesCursor.close()
          level1 = notesArray.map((obj)=>{
            return deleteNotes(obj,ctx.user)
          })

          

          if(!(level1.includes(false))){
            level1 = true
            level2 = await folders.deleteMany({user:ctx.user._id}).then((result)=>{return result.deletedCount > 0 ? true : false})
          }
          if(level2){
            level3 = await users.findOneAndDelete(ctx.user).then((result)=>{return result.value ? true : false})
          }

          return [level1, level2, level3]
        }
    },
    createInvite: async (root,{noteId, to},ctx,info)=>{
      if(noteId === undefined, to === undefined){throw Error("'noteId' and 'to' are required.")}
      let note = await notes.findOne({_id:ObjectId(noteId),users: ctx.user._id})
      if(note === null){throw Error("Note not found, or you don't have acess to note.")}
      let sucess = 0;
      let fail = 0;

      for(let guestEmail of to.split(' ')){
        let guest = await users.findOne({email:guestEmail})
        if(guest === null){
          fail++
          continue
        }
        let result = await invitations.insertOne({from: ctx.user._id, to: guest._id, note: note._id})
        let invite = await invitations.findOne({_id: result.insertedId})

        if(invite !== null){
          sucess++
          pubsub.publish(String(guest._id),{newInvite: invite})

        }
      }
      
      return [sucess, fail]

    },
    responseInvite: async (root,{level,targetId},ctx,info)=>{
      return 'a'

    }
  },
  Subscription:{
   
    answeredInvite: async (root,{level,targetId},ctx,info)=>{
      return 'a'
    },
    newInvite:{
           
            //console.log({root,args,ctx,info})
           subscribe:(root,args,ctx,info)=>{ return pubsub.asyncIterator(String(ctx.user._id))}
          
        }
  },
  User:{
    mainOrActualFolder : async (root, {folderId}, ctx, info)=>{
      
      let folder
      if(folderId){
        folder = await folders.findOne({_id:ObjectId(folderId),user: ctx.user._id})
        if(folder === null){throw Error("Folder not found.")} 
      }else{
        folder = await folders.findOne({_id:root.mainFolder})
      }
      
      return folder
    },
    folderList: async (root,args,ctx,info)=>{
      let cursor = await folders.find({user: root._id})
      let allfolders = await cursor.toArray()
      await cursor.close()
      let response = await allfolders.map(async (obj)=>{
        let unique = {
        name : obj.name,
        _id : obj._id,
        count: 0,
        completed : 0,
        dates : [],
        isMain:false
        }
       
        if(String(obj._id) === String(root.mainFolder)){
            unique.isMain = true
        }

        let notesCursor = await notes.find({folders:obj._id})
        
        
       await notesCursor.forEach(async (obj)=>{

          unique.count++
          
          if(obj.completed === true){
            unique.completed++
          }else{
            unique.dates.push(obj.expiresIn)
          }

        })
       await cursor.close()
      return unique   

      })
      
      return response
    }
  },
  UniqueFolder:{
    notes : async (root,args,ctx,info) =>{
      let cursor = await notes.find({folders:root._id, users: ctx.user._id})
      return cursor.toArray()
    }
  },
  Note: {
    users: async (root,args,ctx,info)=>{
      
      let cursor  = await users.find({_id:{$in:root.users}}, {projection:{name:1,email:1}})
      return cursor.toArray()
    }
  }
};
export default resolvers
