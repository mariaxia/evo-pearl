var http = require('http');
var fs = require('fs');
var path = require('path')
var index = fs.readFileSync(path.join(__dirname, '../bells.js'));

http.createServer(function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", null);
    // res.writeHead(200, {'Content-Type': 'text/javascript'});
    res.end(index);
}).listen(8080, function(){
    console.log('tiny server listening on port 8080.')
});
