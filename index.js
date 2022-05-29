const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vpq6jie.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}




function sendOrderEmail(order){
const {email, name, quantity} = order;

    var Semail = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: `we have received your payment for ${name} is on ${price} at ${quantity} is Confirmed`,
        text: `Your payment for this item ${name} is on ${price} at ${quantity} is Confirmed`,
        html: `
            <div>
            <p> Hello ${displayName}, </p>
            <h3>Thank you for your payment .</h3>
            <h3>We have received your payment .</h3>
            <p>Looking forward to seeing you on ${price} at ${quantity}.</p>
            <h3>Our Address</h3>
            <p>Andor Killa Bandorban</p>
            <p>Bangladesh</p>
            <a href="https://web.programming-hero.com/">unsubscribe</a>
            </div>
            `
      };
      nodemailerMailgun.sendMail(Semail, (err, info) =>{
        if (err) {
          console.log(`Error: ${err}`);
        }
        else {
          console.log(`Response: ${info}`);
        }
      });
    
    
}


function sendPaymentConfirmationEmail(order){
const {email, displayName, name, price,  quantity} = order;

    var Semail = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: `we have received your payment for ${name} is on ${price} at ${quantity} is Confirmed`,
        text: `Your payment for this item ${name} is on ${price} at ${quantity} is Confirmed`,
        html: `
            <div>
            <p> Hello ${displayName}, </p>
            <h3>Thank you for your payment .</h3>
            <h3>We have received your payment .</h3>
            <p>Looking forward to seeing you on ${price} at ${quantity}.</p>
            <h3>Our Address</h3>
            <p>Andor Killa Bandorban</p>
            <p>Bangladesh</p>
            <a href="https://web.programming-hero.com/">unsubscribe</a>
            </div>
            `
      };
      nodemailerMailgun.sendMail(Semail, (err, info) =>{
        if (err) {
          console.log(`Error: ${err}`);
        }
        else {
          console.log(`Response: ${info}`);
        }
      });
    
    
}




const auth = {
    auth: {
      api_key: process.env.EMAIL_SENDER_KEY,
      domain: 'sandbox8cf7e39e8aed466d9702cf754e4247dd.mailgun.org'
    },
  };

  const nodemailerMailgun = nodemailer.createTransport(mg(auth));

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('manufacturer_site').collection('parts');
        const orderCollection = client.db('manufacturer_site').collection('orders');
        const reviewCollection = client.db('manufacturer_site').collection('reviews');
        const userCollection = client.db('manufacturer_site').collection('users');
        const itemCollection = client.db('manufacturer_site').collection('items');
        const paymentCollection = client.db('manufacturer_site').collection('payments');

        const verifyAdmin = async(req, res, next) =>{
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email: requester});
            if(requesterAccount.role === 'admin') {
                next();
            }
            else{
                res.status(403).send({message: 'forbidden'});
            }
        }

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntent.create({
              amount: amount,
              currency: 'usd',
              payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
          });

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).project({name: 1});
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/admin', verifyJWT, async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
          });

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            // const requester = req.decoded.email;
            // const requesterAccount = await userCollection.findOne({email: requester});
            // if(requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: {role:'admin'},
                };
                const result = await userCollection.updateOne(filter, updateDoc);  
                res.send(result);
            // }
            // else{
            //     res.status(403).send({message: 'forbidden'});
            // }
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });

        

        

        // app.get('/available', async(req, res) =>{
        //     const available = req.query.available;
        //     const services = await serviceCollection.find().toArray();
        //     const query = {available: available};
        //     const orders = await orderCollection.find(query).toArray();
        //     services.forEach(service =>{
        //         const serviceOrders = orders.filter(b => b.service === service.name);
        //         const ordered = serviceOrders.map(s=> s.available);
        //         const availables = service.available.filter(s=>!ordered.includes(s));
        //         service.available = availables;
        //     })
        //     res.send(services);
        // })

        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else{
                return res.status(403).send({message: 'forbidden access'});
            }
        });

        app.get('/order/:id', verifyJWT, async(req, res) =>{
            const id = req.params.id;
            const query = {id: ObjectId(id)};
            const order = await orderCollection.findOne(query);
            res.send(order);
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            sendOrderEmail(order);
            res.send(result);
        });

        app.patch('/order/:id', verifyJWT, async(req, res) =>{
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);

        })
        
        app.get('/item',verifyJWT, verifyAdmin, async(req, res) =>{
            const items = await itemCollection.find().toArray();
            res.send(items);
        })

        app.post('/item', verifyJWT, verifyAdmin, async(req, res) =>{
            const item = req.body;
            const result = await itemCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/item/:email', verifyJWT, verifyAdmin, async(req, res) =>{
            const email = req.params.email;
            const filter = {email: email};
            const result = await itemCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/review', async (req, res) => {
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
        app.post('/productByKeys', async (req, res) => {
            const keys = req.body;
            const ids = keys.map(id => ObjectId(id));
            const query = { _id: { $in: ids } }
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            console.log(keys);
            res.send(services);
        });

        app.post("/email", async (req, res) =>{
            const order = req.body;    
            sendOrderEmail(order);
            res.send({status: true});
        });

    }
    finally {

    }

}




run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello From Subaru MF Manufacturer Site !');
})

app.listen(port, () => {
    console.log(`Manufacturer app listening on port ${port}`)
})