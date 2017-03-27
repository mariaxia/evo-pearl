var express = require('express');
var fs = require('fs');
var path = require('path');
var morgan = require('morgan');

var app = express()

app
    .use(morgan('tiny'))
    .use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'index.html'))
})

var server = app.listen(8080, function(){
    console.log('tiny server listening on port 8080.')
});
