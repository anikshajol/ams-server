const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
const teamCollection = client.db("anifaAMS").collection("team");

const packagesCollection = client.db("anifaAMS").collection("packages");

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

    // admin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
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

    app.put("/assets/:id", async (req, res) => {
      try {
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            additionalInformation: item.additionalInformation,
            requestDate: item.requestDate,
          },
        };

        const result = await assetsCollection.updateOne(
          filter,
          updateDoc,
          options
        );

        res.send(result);
      } catch (error) {}
    });

    // employer assets list

    app.get("/my-assets", verifyToken, async (req, res) => {
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

    app.get("/custom-request", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        const query = { email: email };
        console.log(query);
        const result = await customRequestCollection.find(query).toArray();
        res.send(result);
      } catch (error) {}
    });
    // custom request collections

    app.get("/customRequestList", verifyToken, async (req, res) => {
      try {
        const result = await customRequestCollection.find().toArray();
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

    // team collection

    app.get("/team", verifyToken, async (req, res) => {
      try {
        const result = await teamCollection.find().toArray();
        res.send(result);
      } catch (error) {}
    });

    app.post("/team", verifyToken, async (req, res) => {
      try {
        const member = req.body;
        const query = { email: member.email };
        const existingUser = await teamCollection.findOne(query);

        if (existingUser) {
          return res.send({ message: "User already exist", insertedId: null });
        }

        const result = await teamCollection.insertOne(member);

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/team/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        console.log(query);
        // const options = {
        //   projection: { _id: 1, name: 1, category: 1, price: 1, recipe: 1 },
        // };

        const result = await teamCollection.findOne(query);
        res.send(result);
      } catch (error) {}
    });

    app.delete("/team/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        console.log(id, query);
        const result = await teamCollection.deleteOne(query);
        console.log(result);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // packages

    app.get("/packages", async (req, res) => {
      try {
        const result = await packagesCollection.find().toArray();
        res.send(result);
      } catch (error) {}
    });

    // payment

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
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
