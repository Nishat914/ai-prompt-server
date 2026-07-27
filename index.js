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
     const bookmarksCollection = db.collection("bookmarks");
     const reviewsCollection = db.collection("reviews");
    const reportsCollection = db.collection("reports");

    // post
    app.post("/bookmarks", async (req, res) => {
      const { promptId, userEmail } = req.body;

      const existing = await bookmarksCollection.findOne({
        promptId,
        userEmail,
      });

      if (existing) {
        await bookmarksCollection.deleteOne({
          _id: existing._id,
        });

        return res.send({
          bookmarked: false,
          message: "Bookmark removed",
        });
      }

      const bookmark = {
        promptId,
        userEmail,
        createdAt: new Date(),
      };

      await bookmarksCollection.insertOne(bookmark);

      res.send({
        bookmarked: true,
        message: "Prompt bookmarked",
      });
    });
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
    app.delete("/bookmarks/:promptId/:email", async (req, res) => {
      const { promptId, email } = req.params;

      const result = await bookmarksCollection.deleteOne({
        promptId,
        userEmail: email,
      });

      res.send(result);
    });
    app.patch("/prompts/copy/:id", async (req, res) => {
      const id = req.params.id;

      const result = await promptsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: {
            copyCount: 1,
          },
        }
      );

      res.send(result);
    });
    app.post("/reviews", async (req, res) => {
      const review = req.body;

      
      const existing = await reviewsCollection.findOne({
        promptId: review.promptId,
        userEmail: review.userEmail,
      });

      if (existing) {
        return res.status(400).send({
          message: "You have already reviewed this prompt.",
        });
      }

      review.createdAt = new Date();

      const result = await reviewsCollection.insertOne(review);

      res.send(result);

    });

    app.post("/reports", async (req, res) => {
  try {
    const report = req.body;

    const existing = await reportsCollection.findOne({
      promptId: report.promptId,
      userEmail: report.userEmail,
    });

    if (existing) {
      return res.status(400).send({
        message: "You have already reported this prompt.",
      });
    }

    const result = await reportsCollection.insertOne(report);

    res.send(result);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Failed to submit report.",
    });
  }
});
    //  get
    app.get("/my-reviews/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const result = await reviewsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);

        res.status(500).send({
          message: "Failed to fetch reviews",
        });
      }
    });
    app.get("/reviews/:promptId", async (req, res) => {
      try {
        const { promptId } = req.params;

        const result = await reviewsCollection
          .find({ promptId })
          .sort({ createdAt: -1 }) 
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({
          message: "Failed to fetch reviews",
        });
      }
    });
    app.get("/saved-prompts/:email", async (req, res) => {
      const email = req.params.email;

      const bookmarks = await bookmarksCollection
        .find({ userEmail: email })
        .toArray();

      const ids = bookmarks.map(
        (item) => new ObjectId(item.promptId)
      );

      const prompts = await promptsCollection
        .find({
          _id: { $in: ids },
        })
        .toArray();

      res.send(prompts);
    });
    app.get("/bookmarks/:promptId/:email", async (req, res) => {
      const { promptId, email } = req.params;

      const bookmark = await bookmarksCollection.findOne({
        promptId,
        userEmail: email,
      });

      res.send({
        bookmarked: !!bookmark,
      });
    });
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

        let query = {
          status: "approved",
        };

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
