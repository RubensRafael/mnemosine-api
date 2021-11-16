import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config()
// Connection URI

const uri = "mongodb+srv://Rubens:" + process.env.DBPASS + "@mnemosine.jsvmy.mongodb.net/Mnemosine?retryWrites=true&w=majority"
// Create a new MongoClient
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Establish and verify connection
    let database = await client.db("Mnemosine");
    return database
    

  } catch(e) {
    
   console.log(e)
    //await client.close()
  }
}

export default run
