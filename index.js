const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vpq6jie.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const serviceCollection = client.db('manufacturer_site').collection('parts');
        const orderCollection = client.db('manufacturer_site').collection('orders');
        const reviewCollection = client.db('manufacturer_site').collection('reviews');

        app.put('user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upset: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({result, token});
        });

        app.get('/service', async(req, res) =>{
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/available', async(req, res) =>{
            const available = req.query.available;
            const services = await serviceCollection.find().toArray();
            const query = {available: available};
            const orders = await orderCollection.find(query).toArray();
            services.forEach(service =>{
                const serviceOrders = orders.filter(b => b.service === service.name);
                const ordered = serviceOrders.map(s=> s.available);
                const availables = service.available.filter(s=>!ordered.includes(s));
                service.available = availables;
            })
            res.send(services);
        })

        app.post('/order', async(req, res) =>{
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.get('/review', async(req, res) =>{
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        app.post('/reviews', async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.send(result);
        });

        // use post to get services by ids
        app.post('/productByKeys', async(req, res) =>{
            const keys = req.body;
            const ids = keys.map(id => ObjectId(id));
            const query = {_id: {$in: ids}}
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            console.log(keys);
            res.send(services);
        });
        
    }
    finally{

    }

}

run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello From Subaru MF Manufacturer Site !');
})

app.listen(port, () => {
  console.log(`Manufacturer app listening on port ${port}`)
})