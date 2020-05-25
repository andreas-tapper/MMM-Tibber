"use strict";

const mqtt = require('mqtt')
var client;

exports.connect = function (address, port, token) {
   const uri = 'mqtt' + (port == 8883 ? 's' : '') + '://' + address + ':' + port + '/';
   console.log("Trying to connect to '" + uri + "'.");
   
   client = mqtt.connect(uri, {
    clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    username: 'token=' + token
   });

   client.on('connect', function () {
    client.subscribe('presence', function (err) {
      if (!err) {
        client.publish('presence', 'Hello mqtt')
      }
    })
  });
   
  client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString())
    client.end()
  });
};

exports.close = function () {

};
