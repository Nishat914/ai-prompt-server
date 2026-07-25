const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    credentials: true,
    origin: [process.env.CLIENT_URL],
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("ai-prompt");
    
     const promptsCollection = db.collection("prompts");
    // post
    app.post("/prompts", async (req, res) => {
        try {
            const promptData = req.body;

            const newPrompt = {
            ...promptData,

            copyCount: 0,

            status: "pending",

            createdAt: new Date(),
            };

            const result = await promptsCollection.insertOne(newPrompt);

            res.status(201).send({
            success: true,
            message: "Prompt submitted successfully.",
            insertedId: result.insertedId,
            });

        } catch (err) {

            res.status(500).send({
            message: "Something went wrong.",
            });

        }
    });
    app.delete("/prompts/:id" , async (req, res) => {
            const id = req.params.id;

            const result = await promptsCollection.deleteOne({
                _id: new ObjectId(id),
            });

            res.send(result);
        });
        app.patch("/prompts/:id" , async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const result = await promptsCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                $set: updatedData,
                }
            );

            res.send(result);
            });
    //  get
    app.get("/my-prompt/:email", async (req, res) => {
            const email = req.params.email;

            const query = {
                creatorEmail: email,
            };

            const result = await promptsCollection.find(query).toArray();

            res.send(result);
        });
    app.get("/prompts", async (req, res) => {
        const { search, category } = req.query;

        let query = {};

        if (search) {
          query.title = {
            $regex: search,
            $options: "i",
          };
        }

        if (category) {
          query.category = category;
        }

        const result = await promptsCollection.find(query).toArray();

        res.json(result);
      });
    app.get("/prompts/:id" , async (req, res) => {
          const { id } = req.params;
    
          const result = await promptsCollection.findOne({
            _id: new ObjectId(id),
          });
    
          res.json(result);
        });       

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
