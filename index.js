const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  MongoRuntimeError,
} = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d4sgk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "dont have access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    const toolCollection = client.db("scrap_tools_ltd").collection("tools");
    const userCollection = client.db("scrap_tools_ltd").collection("users");
    const reviewCollection = client.db("scrap_tools_ltd").collection("reviews");
    const purchaseCollection = client
      .db("scrap_tools_ltd")
      .collection("purchases");

    app.get("/tool", async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });
    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
    });


    app.get('/user',verifyJWT,async(req,res)=>{
      const users=await userCollection.find().toArray();
      res.send(users);
    })

   app.get('/admin/:email',async(req,res)=>{
     const email=req.params.email;
     const user=await userCollection.findOne({email:email});
     const isAdmin=user.role==='admin';
     res.send({admin:isAdmin});
   })


    app.put("/user/admin/:email",verifyJWT, async (req, res) => {
      const requester=req.decoded.email;
      const requesterAccount=await userCollection.findOne({email:requester});
      if(requesterAccount.role==='admin'){
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
          $set: {role:'admin'},
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message:'forbidden'});
      }    
    });


    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    app.delete("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/purchase", verifyJWT, async (req, res) => {
      const customer = req.query.customer;
      const decodedEmail = req.decoded.email;
      if (customer === decodedEmail) {
        const query = { customer: customer };
        const purchases = await purchaseCollection.find(query).toArray();
        res.send(purchases);
      }
      else{
        return res.status(403).send({message:'forbidden access'});
      }
    });

    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await purchaseCollection.findOne(query);
      res.send(tool);
    });

    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      res.send(result);
    });

    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.put("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const updateStock = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = { $set: updateStock };
      const result = await toolCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from scrap server!!");
});

app.listen(port, () => {
  console.log(`scrap tools app listening on port ${port}`);
});
