const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json())



const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

// Mongo DB code snippet
const uri = `mongodb+srv://${dbUser}:${dbPass}@cluster0.xeklkbf.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Database and collection
        const allUsers = client.db("sipSavorRestaurant").collection("users");
        const allFoods = client.db("sipSavorRestaurant").collection("foods");

        // Get all the food items
        app.get("/allfoods", async(req, res) => {
            const result = await allFoods.find().toArray();
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// Checking if server is runnig
app.get("/", (req, res) => {
    res.send("Sip & Savor Restaurant is running fine")
})

// Declaring port & checking the running port
app.listen(port, () => {
    console.log(`Sip & Savor is running on port: ${port}`)
})