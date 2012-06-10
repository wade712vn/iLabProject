var EventEmitter = require('events').EventEmitter,
  https = require('https'),
  util = require('util'),
  url = require('url'),
  querystring = require('querystring'),
  request = require('request');

var lss_url = "http://127.0.0.1:3000";

var LSSClient = function () {
  // stores the authentication data
  this.auths = {};
  this.loginProcessing = false;
};
LSSClient.prototype = {};

util.inherits(LSSClient, EventEmitter);

LSSClient.prototype.sendRequest = function(params, callback) {
  	
  var url = lss_url + params.path;

  var method = params.method;
  var data = params.data;
  var content_type = params.content_type;

  request({
		headers: {
			'content-type' : content_type
		},
		url: url,
		method: method,
		body: querystring.stringify(data)
	}, 
		function(error, response, body) {
			
			if (!error && response.statusCode == 200) {
				callback(body);
			} else {
				
				callback({"error": error, "statusCode": response.statusCode});
			}
		}
	);
};


exports.LSSClient = LSSClient;