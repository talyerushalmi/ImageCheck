var http = require('http');
var fs = require('fs');
var qs = require('querystring');
var RedisSMQ = require('rsmq');
var url = require("url");
var path = require("path");

var HOST = '127.0.0.1';
var PORT = 6379;
var NAMESPACE = 'rsmq';
rsmq = new RedisSMQ({host: HOST, port: PORT, ns: NAMESPACE});

var server = http.createServer(function(req, res) {
	if (req.method == 'GET') {
		console.log('GET');
		displayForm(req, res);
	}
	else if (req.method == 'POST') {
		console.log('POST');
		processSubmission(req, res);
	}
});

function displayForm(req, res) {
	// handling the GET requests

	var uri = url.parse(req.url).pathname;
	var filename = path.join(process.cwd(), uri);

	fs.exists(filename, function(exists) {
		if(!exists) {
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found\n");
			res.end();
			return;
		}

		if (fs.statSync(filename).isDirectory()) filename += '/index.html';

		fs.readFile(filename, "binary", function(err, file) {
			if(err) {        
				res.writeHead(500, {"Content-Type": "text/plain"});
				res.write(err + "\n");
				res.end();
				return;
			}

			res.writeHead(200);
			res.write(file, "binary");
			res.end();
		});
	});

	return;

	fs.readFile('index.html', function(err, data) {
		res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': data.length });
		res.write(data);
		res.end();
	});
}

function processSubmission(req, res) {
	// handling the POST requests
	
	var body = '';

        req.on('data', function (data) {
		body += data;
		// Kill connection in case data is too big (to prevent DOS)
		// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 = ~1MB
		if (body.length > 1e6)
			req.connection.destroy();
	});

        req.on('end', function () {
		var post = qs.parse(body);
		var urlInput = post.urlInput;
		if (urlInput.length != 0) {
			sendToUntestedQueue(urlInput);
		}
        });

	displayForm(req, res);
}

function sendToUntestedQueue(urlInput) {
	// send the urlInput to the untested URLs queue
	// THEORETICALLY FINISHED BUT UNTESTED !!!! <----------------------------------------------------------------------------------------
	rsmq.sendMessage({qname:"untestedQueue", message: urlInput}, function (err, resp) {
		if (resp) {
			console.log("Message sent. ID:", resp);
		}
	});
}

server.listen(8080);
console.log('Server in running on port 8080');
