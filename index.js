const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all routes
const cors = require('cors');
app.use(cors());

// Middleware to parse URL-encoded bodies (for form submissions)
app.use(express.json()); // Middleware to parse JSON bodies

// Load environment variables from .env file
const dotenv = require('dotenv');
dotenv.config();

//bellow this are comming from mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// jose for JWT verification
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

// Get the MongoDB URI from environment variables
const uri = process.env.MONGODB_URI;

// Created a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//JSON Web Key Set
const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

//middleware
const verifyToken = async (req, res, next) => {
        const authHeader = req.headers.authorization;

        // console.log(authHeader);
        // next();

        if(!authHeader){
            // console.log("No auth header");
            return res.status(401).json({message: "Unauthorize"})
        }
        const token = authHeader.split(" ")[1];
        if(!token){
            // console.log("No token found");
            return res.status(401).json({message: "Unauthorize"})
        }

        try {
            const {payload} = await jwtVerify(token, JWKS);
            // console.log("inside try block", payload);
            return next()
        } catch (error) {
            console.error(error);
            return res.status(403).json({message: "Invalid token"})
        }
        
    }
// Main function to run the server
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const db = client.db("wanderlust");
    const destinationsCollection = db.collection("destinations");
    const bookingsCollection = db.collection("bookings");

    app.get("/featured", async (req, res) => {
      const result = await destinationsCollection.find().limit(4).toArray()
      res.json(result)
    })

    app.get('/destination', async (req, res) => {
        const destinations = await destinationsCollection.find().toArray();
        res.json(destinations); // Send the list of destinations as a JSON response
    });

    app.get('/destination/:id', verifyToken, async (req, res) => {
        const id = req.params; // Get the destination ID from the URL parameters
        const destination = await destinationsCollection.findOne({ _id: new ObjectId(id) });
        
        res.json(destination); 
    });

    app.get('/booking/:userId', async (req, res) => {
        const userId = req.params.userId;
        const bookings = await bookingsCollection.find({ userId: userId }).toArray();
        res.json(bookings); // Send the list of bookings as a JSON response
    });

    app.patch('/destination/:id', async (req, res) => {
        const id = req.params; // Get the destination ID from the URL parameters
        const updateData = req.body; // Extract ID and update data from request body
        const result = await destinationsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        // console.log(updateData);
        res.json(result); // Send the result of the update back to the client
    });

    app.delete('/destination/:id', async (req, res) => {
        const id = req.params; // Get the destination ID from the URL parameters
        const result = await destinationsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result); // Send the result of the deletion back to the client
    });

    app.delete('/booking/:id', async (req, res) => {
        const id = req.params; // Get the booking ID from the URL parameters
        const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
        res.json(result); // Send the result of the deletion back to the client
    });

    app.post('/destination', async (req, res) => {
        const destinationData = req.body; // Assuming the destination data is sent in the request body
        // console.log(destinationData); // it will show in the terminal**
        const result = await destinationsCollection.insertOne(destinationData);
        res.json(result); // Send the result of the insertion back to the client
    });

    app.post('/booking', verifyToken, async (req, res) => {
        const bookingData = req.body; // Assuming the booking data is sent in the request body
        const result = await bookingsCollection.insertOne(bookingData);
        res.json(result); // Send the result of the insertion back to the client
    });





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// This is a API route that    sends "Hello World!" as a response when the root URL is accessed.
app.get('/', (req, res) => { 
  res.send('Hello World!');
});

app.listen(port, () => { // This starts the server .
  console.log(`Example app listening at http://localhost:${port}`);
});