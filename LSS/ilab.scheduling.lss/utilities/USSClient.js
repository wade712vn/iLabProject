var EventEmitter = require('events').EventEmitter,
  https = require('https'),
  util = require('util'),
  url = require('url'),
  request = require('request');

var USSClient = function () {
  // stores the authentication data
  this.auths = {};
  this.loginProcessing = false;
};
USSClient.prototype = {};

util.inherits(USSClient, EventEmitter);

USSClient.prototype.sendRequest = function(params) {
  
};

