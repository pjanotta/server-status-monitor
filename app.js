
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var async = require('async');
var request = require('request');

var mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectId;

var serverSchema = mongoose.Schema({
    host: String, port: Number, description: String, url: String, CORS: Boolean
});
var Server = mongoose.model('Server', serverSchema);

function getMongooseConnection(dbAddress, callback) {
	var db;
    mongoose.connect(dbAddress);

    db = mongoose.connection;
    db.on('error', function (err) {
    	console.error('DB connection error: ' + err);
    	console.error('closing DB connection');
    	mongoose.disconnect();
    	return;
    });
    db.once('open', callback);
}

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  	app.use(express.errorHandler());
}


app.get('/config/servers.json', function (req, res) {
	getMongooseConnection('mongodb://localhost/servers', function () {
        Server.find({}, function(err, data) {
        	mongoose.disconnect();
        	if(!err) {
        		res.json(data);
        	} else {
        		res.send(500);
        	}
    	});
	});	
});


app.get('/test', function (req, res) {
	setTimeout(function () {
		res.send(500);
	}, 700);
});


app.delete('/remove/:id', function(req, res) {
    if(!req.params) res.send(400); //Bad request
	getMongooseConnection('mongodb://localhost/servers', function () {
        Server.remove({"_id": new ObjectId(req.params.id)}, function(err) {
        	mongoose.disconnect();
        	if(!err) {
        		res.send(200);
        	} else {
        		res.send(500, 'Error removing server with _id: ' );
        	}
    	});
	});
});


app.put('/modify/:id', function(req, res) {
    if(!req.body || !req.params) res.send(400); //Bad request
	getMongooseConnection('mongodb://localhost/servers', function () {
       var newProperties = {
        	"description":req.body.description || '',
        	"host":req.body.host || '',
        	"port":req.body.port || 80,
        	"url":req.body.url || '',
        	"CORS": !!req.body.CORS
        };
        console.log(newProperties);
        Server.update({"_id": new ObjectId(req.params.id)}, newProperties, { upsert: true }, function(err) {
        	mongoose.disconnect();
        	if(!err) {
        		res.send(200, 'Successful update of #' + req.params.id);
        	} else {
        		res.send(500, 'Error updating infos for server with _id: ' + req.params.id);
        	}
    	});
	});
});


app.post('/add', function (req, res) {
    console.log('add');
    if(!req.body) res.send(400); //Bad request
	getMongooseConnection('mongodb://localhost/servers', function () {
        var newServer = new Server({
        	"description":req.body.description || '',
        	"host":req.body.host || '',
        	"port":req.body.port || 80,
        	"url":req.body.url || '',
        	"CORS": !!req.body.CORS
        });
        console.log('adding server');
        console.log(newServer);
        newServer.save(function(err, addedServer) {
        	mongoose.disconnect();
        	if(!err) {
        		console.log('added');
        		res.json(addedServer);
        	} else {
        		console.log('error');
        		res.send(500, 'Error while adding server');
        	}
    	});
	});
});


app.post('/restore-defaults', function (req, res) {
	getMongooseConnection('mongodb://localhost/servers', function () {
	    Server.remove({}, function (err) {
	        if (err) { 
	            console.error(err);
	            console.error('disconnect + abort'); 
	            mongoose.disconnect();
	            res.send(500);
	        } else { 
	            console.log('Old server config cleared from DB');
	            copyJSON();              
	        }
	    });

	    function copyJSON() {
	        var servers;
	        console.log('Copy config/servers-default.json to servers DB');
	        servers = JSON.parse(fs.readFileSync('config/servers-default.json'));

	        async.map(servers, saveServer, function (err, results) {
	            mongoose.disconnect();
	            res.json(results);
	        });

	        function saveServer(item, callback) {
	            var newServer;
	            newServer = new Server(item);
	            newServer.save(function(err, savedServer) {
	                if (err) { 
	                    console.error(err); 
	                    res.send(500);
	                } else { 
	                    console.log('saved server with _id: ' + savedServer["_id"]); 
	                }
	                callback(err, savedServer);
	            });
	        }
	    }
	});
});


// Route through server in case of no CORS
app.get('/check', function(req, res) {
	if(req.query && req.query.q) {
		console.log('check: ' + decodeURIComponent(req.query.q))
		request(decodeURIComponent(req.query.q), function (err, newRes, body) {
        	if(!err && newRes && newRes.statusCode === 200) {
        		if(newRes.headers && newRes.headers['content-type'] && newRes.headers['content-type'].indexOf('application/json') != -1) {
        			res.json(JSON.parse(body));
        		} else {
        			res.send(200);
        		}
        	} else {
        		if(err) console.error(err);
                if(newRes && newRes.statusCode && body) {
        			res.send(newRes.statusCode, body);
                } else {
                	res.send(500);
                }
        	}
		});
	} else {
        //Bad request
		res.send(400);
	}
});

http.createServer(app).listen(app.get('port'), function(){
  	console.log('Express server listening on port ' + app.get('port'));
});
