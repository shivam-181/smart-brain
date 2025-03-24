const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const fetch = require('node-fetch'); // Required to make API requests
const knex = require('knex');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize database connection using Render's DATABASE_URL environment variable
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,  // Use the Render provided DATABASE_URL
  ssl: { rejectUnauthorized: false },  // Required for SSL connection on Render
});

// To avoid CORS
const app = express();
app.use(bodyParser.json());
app.use(cors({
    origin: 'https://smart-brain-fe.vercel.app', // Your frontend URL
    methods: 'GET, POST, PUT, DELETE',
    credentials: true
}));


// Clarifai API Credentials
const PAT = "5d0cb5b848b945b385f938bca351b4c5";
const USER_ID = "shivam6703";
const APP_ID = "my-first-application";
const MODEL_ID = "face-detection"; 

// Proxy route to forward Clarifai API requests
app.post('/clarifai', async (req, res) => {
    const { imageUrl } = req.body;

    const raw = JSON.stringify({
        user_app_id: {
            user_id: USER_ID,
            app_id: APP_ID,
        },
        inputs: [
            {
                data: {
                    image: {
                        url: imageUrl,
                    },
                },
            },
        ],
    });

    try {
        const response = await fetch(`https://api.clarifai.com/v2/models/${MODEL_ID}/outputs`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Authorization": "Key " + PAT,
                "Content-Type": "application/json",
            },
            body: raw,
        });

        const data = await response.json();
        res.json(data); // Send response back to frontend
    } catch (error) {
        console.error("Error forwarding request to Clarifai:", error);
        res.status(500).json({ error: "Error processing Clarifai request" });
    }
});

app.get("/", (req, res) => {
  res.json({ status: "Backend is running!" }); // This will return JSON instead of an error page
});

// POST /signin - User login
app.post('/signin', (req, res) => {
    db.select('email','hash').from('login')
    .where('email','=',req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) {
            return db.select('*').from('users')
                .where('email', '=', req.body.email)
                .then(user => {
                    res.json(user[0]);
                })
                .catch(err => res.status(400).json('Unable to get user'));
        } else {
            res.status(400).json('Wrong Credentials');
        }
    })
    .catch(err => res.status(400).json('Wrong Credentials'));
});

// POST /register - Register new user
app.post('/register', (req, res) => {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
        return res.status(400).json("All fields are required");
    }

    const hash = bcrypt.hashSync(password);  // Include salt rounds

    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0].email,
                    name: name,
                    joined: new Date()
                });
        })
        .then(user => {
            res.json(user[0]);
            return trx.commit();  // Ensure transaction commits
        })
        .catch(err => {
            trx.rollback();  // Ensure rollback on failure
            res.status(400).json("Unable to register");
        });
    });
});

// GET /profile/:id - Get user profile
app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({id})
    .then(user => {
        if (user.length) {
            res.json(user[0]);
        } else {
            res.status(400).json('Not found');
        }
    })
    .catch(err => res.status(400).json('Error getting user'));
});

// PUT /image - Increment entry count
app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0].entries);
    })
    .catch(err => res.status(400).json('Unable to get entries'));
});

// Start the server
const PORT = process.env.PORT || 3000;  // Default to 3000 if not set
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
