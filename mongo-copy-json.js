
/**
 * Module dependencies.
 */

var fs = require('fs');
var mongoose = require('mongoose');
var async = require('async');
var serverSchema, Server, db;

serverSchema = mongoose.Schema({
    host: String, port: Number, description: String, url: String, CORS: Boolean
});
Server = mongoose.model('Server', serverSchema);

mongoose.connect('mongodb://localhost/servers');

db = mongoose.connection;
db.on('error', function (err) {
    console.error('DB connection error: ' + err);
})
db.once('open', function () {
    Server.remove({}, function (err) {
        if (err) { 
            console.error(err);
            console.error('disconnect + abort script'); 
            mongoose.disconnect();
            process.exit();
        } else { 
            console.log('Old server config cleared from DB');
            copyJSON();              
        }
    });

    function copyJSON() {
        var servers;
        console.log('Copy config/servers-default.json to servers DB');
        servers = JSON.parse(fs.readFileSync('config/servers-default.json'));

        async.map(servers, saveServer, function () {
            mongoose.disconnect();
            process.exit();
        });

        function saveServer(item, callback) {
            var newServer;
            newServer = new Server(item);
            newServer.save(function(err, savedServer) {
                if (err) { 
                    console.error(err); 
                } else { 
                    console.log('saved server with _id: ' + savedServer["_id"]); 
                }
                callback();
            });
        }
    }

});
