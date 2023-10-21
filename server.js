const express = require('express');
const HttpError = require('./models/http-error');

const session = require("express-session");
const morgan = require('morgan');
const helmet = require('helmet');
const compress = require('compression')
const cors = require('cors');
const bodyParser = require('body-parser');

require("dotenv").config();

const route = require('./routes/index');
const app = express();

app.use(express.json());
// Use compress!
app.use(compress());
// Use Helmet!
app.use(helmet());
// HTTP  logger
app.use(morgan('combined'));
app.use(cors());
app.set('view engine', 'pug');

//ConnectDB
const { DBconnect } = require("./configs/ConnectDB");
DBconnect();


app.use((req, res, next) => {
    const error = new HttpError('Đường dẫn không tồn tại!', 404);
    throw error;
});

app.use((error, req, res, next) => {
    if(res.headerSent){
        return next(error);
    }
    res.status(error.code || 500);
    res.json({message: error.message || 'Lỗi không xác định!'});
});


const oneDay = 1000 * 60 * 60 * 24;
app.use(
  session({
    secret: "team2-uptech",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
  })
);

app.use(express.json());
app.use('/api', route)

app.listen(process.env.PORT, () => {
  console.log(`app is running on port ${process.env.PORT}`);
});

// Sử dụng body-parser middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.listen(5000);