const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['https://sip-savor-restaurant.web.app', 'https://sip-savor-restaurant.firebaseapp.com'],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


// creating custom middleware

// Custom middleware to verfy token
const verifyToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        res.status(401).send({ message: 'Unauthorized' })
    }
    // Verify token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized' })
        }
        req.decoded = decoded;
        next();
    })
}



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
        // await client.connect();

        // Database and collection
        const allFoods = client.db("sipSavorRestaurant").collection("foods");
        const allUserPurchases = client.db("sipSavorRestaurant").collection("userPurchases");



        // Get data from client side and create token
        app.post("/tokencreate", async (req, res) => {
            try {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: "1h",
                });
                res
                    .cookie("token", token, {
                        sameSite: "none",
                        secure: true,
                        httpOnly: true,
                    })
                    .send({ success: true });
            }
            catch (error) {
                res.status(401).send(error);
            }
        });



        // new post
        app.post("/signoutuser", async (req, res) => {
            const user = req.body;
            res.clearCookie("token", { maxAge: 0 }).send({ clearsuccess: true });
        });


        // get the total number of food items in the allFoods collection
        app.get("/totalfoods", async (req, res) => {
            const total = await allFoods.estimatedDocumentCount();
            res.send({ total });
        })

        // Get paginated food items
        app.get("/foodsoncollection", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await allFoods.find().skip(page * size).limit(size).toArray();
            res.send(result);
        })

        // get all the foods
        app.get("/allfoods", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await allFoods.find().toArray();
            res.send(result);
        })

        // Get single food item using product ID
        app.get("/allfoods/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allFoods.findOne(query);
            res.send(result);
        })

        // Get all the foods added by current user
        app.get("/userFoods/:id", verifyToken, async (req, res) => {
            const email = req.params.id;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            };
            const query = { addedBy: email };
            const result = await allFoods.find(query).toArray();
            res.send(result);
        })

        // get all the purchased foods by current user (cart)
        app.get("/purchased/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            };
            const query = { buyerEmail: email };
            const result = await allUserPurchases.find(query).toArray();
            res.send(result);
        })


        // Create new data for user purchased collection
        app.post("/purchasedProducts", async (req, res) => {
            const newPurchase = req.body;
            const result = await allUserPurchases.insertOne(newPurchase);
            res.send(result);
        })

        // Create new product from client side profile add new product form
        app.post("/addnewproduct", async (req, res) => {
            const newProduct = req.body;
            const result = await allFoods.insertOne(newProduct);
            res.send(result);
        })


        // update existing quantity and total order count for allFoods
        app.put("/allfoods/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedProductInfo = req.body;
            const updateDoc = {
                $set: {
                    foodQuantity: updatedProductInfo.reaminingQuantity,
                    orderCount: updatedProductInfo.totalOrder,
                }
            };
            const result = await allFoods.updateOne(filter, updateDoc, options);
            res.send(result);
        })


        // Update product info from client side user profile product updating form
        app.put("/updateFood/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedProductInfo = req.body;
            const updateDoc = {
                $set: {
                    food: updatedProductInfo.food,
                    price: updatedProductInfo.price,
                    foodQuantity: updatedProductInfo.foodQuantity,
                    foodImage: updatedProductInfo.foodImage,
                    cookerName: updatedProductInfo.cookerName,
                    foodOriginCountry: updatedProductInfo.foodOriginCountry,
                    foodDescription: updatedProductInfo.foodDescription,
                    foodCategory: updatedProductInfo.foodCategory,
                }
            };
            const result = await allFoods.updateOne(filter, updateDoc, options);
            console.log(result);
            res.send(result);
        })


        // Delete a user's product from purchase list
        app.delete("/purchased/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allUserPurchases.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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