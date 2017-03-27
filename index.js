const express = require('express');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

const app = express()

app
    .use(morgan('tiny'))
    .use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, function(){
    console.log('evo-pearl listening on port 8080.')
});
