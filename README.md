server-status-monitor
=====================

This is an AngularJS/node.js app to monitor the availability of servers that I made as a challenge for a job I applied.

The app tries to check availability directly if server supports CORS. Alternatively, the node.js server is used as a proxy to check the server indirectly.

###Installation

Repository does not contain the required node modules. So you need to install the modules via

    $ npm install

Also you need to create the initial mongodb data set. The easiest way to do this is to use the mongo-copy-json.js script and edit the servers in config/servers-default.json

    $ node mongo-copy-json.js

###Missing Features

The following features were planned, but have not yet been implemented:

* Status messages in UI after successful tasks or errors
* Push notification and sync via socket.io
* Nicer look
* Appropiate documentation
* Built process
* Tests
