'use strict';
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const autoIncrement = require('@nakanokurenai/mongoose-auto-increment');

const dns = require('dns');
const { URL } = require('url');
const cors = require('cors');
const validUrl = require('valid-url');

const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

// Create DB connection.
let connection = mongoose.createConnection(
    process.env.MONGO_URI,
    { useNewUrlParser: true }
);
autoIncrement.initialize(connection);

const ShortUrlSchema = new Schema({
  originalUrl: { type: String, required: true },
});
ShortUrlSchema.plugin(autoIncrement.plugin, 'ShortUrl');
const ShortUrl = connection.model('ShortUrl', ShortUrlSchema);

app.use(cors());

// Mount body-parser.
app.use(bodyParser.urlencoded({extended: false}));

// Logger Middleware to test input.
app.use((req, res, next) => loggerMiddleware(req, res, next));
function loggerMiddleware(req, res, next) {
  console.log(req.method + ' ' + req.hostname + req.path + ' - ' + req.ip);
  if (req.method === 'POST') {
    console.log(req.body);
  }
  next();
}

// Default paths.
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});


// Apis and Microservices Projects - URL Shortener Microservice
// URL-Shortener Create new short url.
app.post('/api/shorturl/new',(req, res) => {
  const errorObj = {"error": "invalid URL"};

  if (req.body.url && validUrl.isWebUri(req.body.url) && req.hostname) {
    const urlToShorten = req.body.url;
    const urlParsed = new URL(urlToShorten).hostname.replace('www.','');

    dns.lookup(urlParsed, (dnsError) => {
      if (dnsError) {
        console.log(dnsError, req.body.url);
        res.json(errorObj);
      }
      else {
        const urlToSave = new ShortUrl({originalUrl: urlToShorten});
        urlToSave.save((err, data) => {
          err ? res.json({error: 'save failure'}) :
              res.json({
                "original_url": data.originalUrl,
                "short_url": data._id
              });
        });
      }
    });
  } else {
    res.json(errorObj);
  }
});

// URL-Shortener Create redirect to short url.
app.get("/api/shorturl/:urlid", (req, res) => {
  if (Number(req.params.urlid)) {
    ShortUrl.findById(
        req.params.urlid,
        (err, data) => err ? res.json({"error": "invalid URL"}) :
            res.redirect(data.originalUrl)
    );
  } else {
    res.json({"error": "invalid URL"})
  }
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});