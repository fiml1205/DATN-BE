const express = require('express')
const path = require('path')
require('dotenv').config();
const users = require('./routers/users')
const connectDB = require('./config/db')
const cors = require('cors');

const app = express()
const port = process.env.PORT || 8000

function configureApp(app) {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')))
  // app.use(cors());

  app.use(function (err, req, res, next) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
      // render the error page
      res.status(err.status || 500);
  });
}

connectDB(process.env.DB_URI)

configureApp(app)
app.use('/api/users', users)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})