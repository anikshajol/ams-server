const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();

const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jgojmkc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const assetsCollection = client.db("anifaAMS").collection("assetsList");
const employerAssetsCollection = client
  .db("anifaAMS")
  .collection("employeeAssets");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // assets list get

    app.get("/assets", async (req, res) => {
      try {
        const filter = req.query;
        const query = {
          assetName: {
            $regex: filter.search,
            $options: "i",
          },
        };
        const result = await assetsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {}
    });

    // employer assets list

    app.get("/my-assets", async (req, res) => {
      try {
        const filter = req.query;
        console.log(filter);
        const query = {
          assetName: { $regex: filter.search, $options: "i" },
        };

        const result = await employerAssetsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {}
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("hello server");
});

app.listen(port, () => {
  console.log(`server is running on ${5000} port`);
});
