var http = require('http');
var fs = require('fs');
var qs = require('querystring');

var server = http.createServer(function(req, res) {
	if (req.method == 'GET') {
		console.log("GET");
		displayForm(res);
	}
	else if (req.method == 'POST') {
		console.log("POST");
		processSubmission(req, res);
	}
});

function displayForm(res) {
	// handling the GET requests
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
			console.log("Received data: " + urlInput);
		}
        });

	displayForm(res);
}

server.listen(8080);
console.log("Server in running on port 8080");
