var async = require('async');
var RedisSMQ = require('rsmq');
var request = require('request');

var HOST = '127.0.0.1';
var PORT = 6379;
var NAMESPACE = 'rsmq';
var redisOptions = {
	retry_strategy: function (options) {
		if (options.error.code === 'ECONNREFUSED') {
			// End reconnecting on a specific error and flush all commands with a individual error
			return new Error('The server refused the connection');
		}
		if (options.total_retry_time > 1000 * 60 * 60) {
			// End reconnecting after a specific timeout and flush all commands with a individual error
			return new Error('Retry time exhausted');
		}
		if (options.times_connected > 10) {
			// End reconnecting with built in error
			return undefined;
		}
		// reconnect after
	        return Math.max(options.attempt * 100, 3000);
	}
};
var rsmq = new RedisSMQ({host: HOST, port: PORT, ns: NAMESPACE, options: redisOptions});

function init(callback) {
	rsmq.createQueue({qname:'untestedQueue'}, function (err, resp) {
		// create 'untestedQueue' queue
		if (resp === 1) {
			console.log('untestedQueue created.');
		}
		else {
			console.log('Could not create untestedQueue - maybe it already exists?');
		}
	});

	rsmq.createQueue({qname:'imageQueue'}, function (err, resp) {
		// create 'imageQueue' queue
		if (resp === 1) {
			console.log('imageQueue Queue created.');
		}
		else {
			console.log('Could not create imageQueue - maybe it already exists?');
		}
	});

	rsmq.createQueue({qname:'notImageQueue'}, function (err, resp) {
		// create 'notImageQueue' queue
		if (resp === 1) {
			console.log('notImageQueue created.');
		}
		else {
			console.log('Count not create notImageQueue - maybe it already exists?');
		}
	});

	callback(null)
}

function receiveUrl() {
	rsmq.receiveMessage({qname:'untestedQueue'}, function (err, resp) {
		if (resp.id) { // if there's an item in untestedQueue
			console.log('Message received.', resp);
			if (checkUrl(resp)) { // if url contains an image send to imageQueue
				rsmq.sendMessage({qname: 'imageQueue', message: resp}, function (err, inner_resp) {
					if (inner_resp) {
						console.log('[+] Contains an image: ', resp.id);
					}
				});
			}
			else { // if url does not contain an image send to notImageQueue
				rsmq.sendMessage({qname: 'notImageQueue', message: resp}, function (err, inner_resp) {
					if (inner_resp) {
						console.log('[-] Does not contain an image: ', resp.id);
					}
				});
			}
			// remove the URL from untestedQueue
			rsmq.deleteMessage({qname:'untestedQueue', id: resp.id}, function (err, resp) {
				if (resp === 1) {
					console.log('Message ', resp.id, ' deleted from untestedQueue.');
				}
			});
		}
		// else - no items in untestedQueue
	});
}

function checkUrl(urlInput) {
	// image format magic numbers from here: http://www.astro.keele.ac.uk/oldusers/rno/Computing/File_magic.html
	var magicNums = {
		bmp: '424d',
		fits: '53494d504c45',
		gif: '47494638',
		gks: '474b534d',
		rgb: '01da',
		itc: 'f10040bb',
		jpg: 'ffd8ffe0',
		nif: '49494e31',
		pm: '56494557',
		png: '89504e47',
		ps: '2521',
		ras: '59a66a95',
		tga: 'xxxxxx',
		tif: '4d4d002a',
		tif2: '49492a00',
		xbm: 'xxxx',
		xcf: '67696d70207863662076',
		fig: '23464947',
		xpm: '2f2a2058504d202a2f'
	};
	request(options, function (err, response, body) {
		if(!err && response.statusCode == 200){
			for (var format in magicNums) {
				if (magicNums[format] == body.toString('hex', 0, magicNums[format].length / 2)) // check for matches
					return true; // found match
			}
		}
	});

	return false; // no matches were found
}

function loop(callback) {
	// loop on receiveUrl
	console.log('Entered loop.');
	// the loops causes a heap overflow, each iteration should finish before continuing <---------------------------------------
	while (true) {
		receiveUrl()
	}

	callback(null);
}

function main() {
	// the program gets to the loop before calling init(), fix waterfall architecture <-----------------------------------------
	async.waterfall([
		init,
		loop
	], function (err, result) {
		console.log('Exited loop.');
	});
}

main();
