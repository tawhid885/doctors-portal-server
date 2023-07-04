const express = require("express")
const app = express()
const cors = require("cors")
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000

// doctors-portal-firebase-adminsdk
const admin = require("firebase-admin");

const serviceAccount = require('./doctors-portal-firebase-adminsdk');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// working as a middle wire 
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.NAME}:${process.env.PASSWORD}@cluster0.zfjtfyh.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function verifyToken(req, res, next){
  if(req.headers?.authoraization?.startsWith('Bearer ')){
    const token = req.headers.authoraization.split(" ")[1];
    try{
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch{

    }
  }
  next();
}

async function run(){
  try{
    await client.connect();
    console.log("database is connected")
    const database = client.db("doctors_portal");
    const appointmentCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

    app.post('/appointments',async(req, res)=>{
      
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      console.log(appointment);
      res.json({message:result})
    }); 

    app.post('/users', async(req, res)=>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(user);
      res.json(result)
    })

    app.put("/users", async(req, res)=>{
      const user = req.body;
      const filter = {email: user.email};
      const options = {upsert: true};
      const updateDoc = {
        $set: user
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    })

    app.put("/users/admin",verifyToken ,async(req, res)=>{
      const email = req.body.email;
      const requester = req.decodedEmail;
      // console.log(token);
      if(requester){
        const requesterAccount = await usersCollection.findOne({email:requester});
        if(requesterAccount.role == 'admin'){
          const filter = {email: email};
          const updateDoc ={
            $set: {role: 'admin'}
          }
          const result = await usersCollection.updateOne(filter, updateDoc);
          console.log("result is", result);
          res.json(result);
        }
      }
      else{
        res.status(403).json({message:'you do not have access to make admin'});
      }
      
      // console.log(email);
    })

    app.get('/appointments', async(req, res)=>{
      const email = req.query.email;
      const date = new Date(req.query.date).toDateString();
      const query = {patient_email: email, date:date}
      console.log(date)
      const cursor = appointmentCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
    })

    app.get('/users/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email:email};
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if(user?.role == 'admin'){
        isAdmin=true
      }
      res.send({isAdmin: isAdmin})
    })
  }finally{

  }
}

run().catch(console.dir)

app.get('/', (req, res)=>{
    res.send("hello world")
})

app.listen(port, ()=>{
    console.log(`server is running at ${port}`)
})