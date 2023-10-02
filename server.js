const express = require('express');

const HttpError = require('./models/http-error');

const app = express();

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

app.listen(5000);