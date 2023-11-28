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
const customRequestCollection = client
  .db("anifaAMS")
  .collection("customRequest");

const usersCollection = client.db("anifaAMS").collection("users");
const adminCollection = client.db("anifaAMS").collection("admin");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.post("/jwt", async (req, res) => {
      try {
        const user = req.body;
        console.log(user, "user of token");

        const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });

        res.send({ token });
      } catch (error) {}
    });

    // middlewares for verifytoken;

    // const verifyToken = (req, res, next) => {
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: "unauthorized access" });
    //   }
    // };

    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        res.status(401).send({ message: "Forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // assets list get

    app.get("/assets", verifyToken, async (req, res) => {
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

    app.post("/assets", verifyToken, async (req, res) => {
      try {
        const asset = req.body;
        const result = await assetsCollection.insertOne(asset);
        res.send(result);
      } catch (error) {}
    });

    // employer assets list

    app.get("/my-assets", async (req, res) => {
      try {
        const email = req.query.email;
        const filter = req.query;

        console.log(filter);
        const query = {
          email: email,
          assetName: { $regex: filter.search, $options: "i" },
        };

        const result = await employerAssetsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {}
    });

    // custom request collections

    app.get("/custom-request", async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email };
        console.log(query);
        const result = await customRequestCollection.find(query).toArray();
        res.send(result);
      } catch (error) {}
    });

    app.post("/custom-request", async (req, res) => {
      try {
        const assets = req.body;
        const result = await customRequestCollection.insertOne(assets);
        res.send(result);
      } catch (error) {}
    });

    // users collection

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "User already exist", insertedId: null });
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {}
    });

    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {}
    });

    // app.get("/users/admin/:email", async (req, res) => {
    //   try {
    //     const email = req.params.email;

    //     const query = { email: email };
    //     const user = await usersCollection.findOne(query);

    //     let admin = false;
    //     if (user) {
    //       admin = user?.role === "admin";
    //     }
    //     res.send({ admin });
    //   } catch (error) {}
    // });

    // app.get("/users/employee/:email", async (req, res) => {
    //   try {
    //     const email = req.params.email;
    //     const query = { email: email };

    //     const user = await usersCollection.findOne(query);

    //     let employee = false;
    //     if (user) {
    //       employee = user?.role === "employee";
    //     }

    //     res.send({ admin });
    //   } catch (error) {}
    // });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };

        if (email != req.decoded.email) {
          return res.status(403).send({ message: "unauthorized access" });
        }

        const user = await usersCollection.findOne(query);

        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }

        res.send({ admin });
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
