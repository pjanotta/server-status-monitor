var monitorApp = angular.module('monitorApp', []);

monitorApp.filter('toArray', function() {
    return function (obj) {
        var attr, outArray = [];
        for(attr in obj) {
            outArray.push(obj[attr]);
        }
        return outArray;
    }
});

monitorApp.controller('ServerConfigController', function ($scope, $http) {
    var PROXY = 'http://localhost:3000/check?q=';

    $http.get('config/servers.json').
        success(updateServers).
        error(function () {
            console.log('Error retrieving server list');
        });

    function updateServers(data) {
        $scope.isHidden = {};
        $scope.servers = {};
        $scope.selectedServer = null;
        for (server in data) {
            $scope.servers[data[server]["_id"]] = data[server];
            checkServer(data[server]);
        }
    }

    function checkServer(serverObj) {
        healthcheckUrl = 'http://' + serverObj.host + (serverObj.port ? ':' + serverObj.port : '') + (serverObj.url || '/');
        serverObj.status = "checking";

        //If no CORS use webserver as proxy
        if(!serverObj.CORS) {
            healthcheckUrl = PROXY + encodeURIComponent(healthcheckUrl);
        }

        $http.get(healthcheckUrl).
            success(
                genHealthcheckCallback($scope.servers, serverObj, true)
            ).
            error(
                genHealthcheckCallback($scope.servers, serverObj, false) 
            );
    }

    function genHealthcheckCallback(servers, serverData, successful) {
        return function (response, status, headers) {
            serverData.response = response;
            serverData.successful = successful;
            serverData.status = status;
            servers[serverData["_id"]] = serverData;
        }
    }

    $scope.successClass = function (successful) {
        return successful ? 'success' : 'failure';
    }

    $scope.remove = function (id, $index) {
        if($scope.selectedServer === id) {
            $scope.deselect();
            $scope.serverForm.active = false;
        }
        $scope.isHidden[$index] = true;
        $http.delete('/remove/' + id).
            success(function () { 
                console.log('Server successfully removed from watch list');
            }).
            error(function () { 
                console.log('Could not delete server: '); 
            });   
    }

    $scope.select = function (selectedServer) {
        var attr;
        $scope.selectedServer = selectedServer;
        for(attr in $scope.servers[selectedServer]) {
            $scope[attr] = $scope.servers[selectedServer][attr];
        }
    }

    $scope.deselect = function() {
        if(!$scope.selectedServer) return;
        var attr;
        for(attr in $scope.servers[$scope.selectedServer]) {
            $scope[attr] = null;
        }
        $scope.selectedServer = null;               
    }

    $scope.modify = function () {
        var id = $scope.selectedServer;
        for(attr in $scope.servers[id]) {
            if(attr === "_id") continue;
            $scope.servers[id][attr] = $scope[attr];
        }
        $scope.serverForm.active = false;
        $http.put('/modify/' + id, $scope.servers[id]).
            success(function () { 
                console.log('Successfully modified server properties'); 
                checkServer($scope.servers[id]);
            }).
            error(function () { 
                console.log('Error modifying server'); 
            });   
    }

    $scope.add = function (id) {
        var data = {
            description: $scope.description,
            host: $scope.host ,
            port: $scope.port,
            url: $scope.url,
            CORS: $scope.CORS
        };
        $scope.serverForm.active = false;
        $http.post('/add', data).
            success(function (addedServer) { 
                $scope.servers[addedServer["_id"]] = addedServer;
                checkServer(addedServer);
            }).
            error(function () { 
                console.log('Could not add server'); 
            });   
    }

    $scope.reset = function () {
        $http.post('/restore-defaults').
            success(function (data) { 
                updateServers(data);
                console.log('Defaults restored');
            }).
            error(function () { 
                console.log('Error during reset'); 
            });   
    }

    $scope.recheck = function () {
        updateServers($scope.servers);
    }
});
