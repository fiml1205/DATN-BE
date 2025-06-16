const express = require('express')
const path = require('path')
require('dotenv').config();
const user = require('./routers/user.js')
const admin = require('./routers/admin')
const project = require('./routers/project.js');
const notification = require('./routers/notification.js');
const image = require('./routers/image.js');
const vote = require('./routers/vote.js');
const comment = require('./routers/comment.js');
const save = require('./routers/save');
const connectDB = require('./config/db')
const cors = require('cors');
const rateLimit = require("express-rate-limit");

const app = express()
const port = process.env.PORT || 8000

function configureApp(app) {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')))
  app.use(express.static(__dirname))

  app.use(function (err, req, res, next) {
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
      res.status(err.status || 500);
  });
}

connectDB(process.env.DB_URI)

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: "Too many requests, please try again later.",
});

app.use("/api/", limiter);

configureApp(app)
app.use('/api/user', user)
app.use('/api/admin', admin)
app.use('/api/project', project)
app.use('/api/notification', notification)
app.use('/api/image', image)
app.use('/api/vote', vote)
app.use('/api/comment', comment)
app.use('/api/save', save);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})