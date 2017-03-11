var express = require('express');
var fs = require('fs');
var path = require('path');
var morgan = require('morgan');

var app = express()

app
    .use(morgan('tiny'))
    .use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", null);
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
    .use(express.static(path.join(__dirname, '..', 'public')))

app.get('/', (req, res, next) => {
    console.log('hi')
    res.sendFile(path.join(__dirname, '..', 'index.html'))
})

var server = app.listen(8080, function(){
    console.log('tiny server listening on port 8080.')
});
