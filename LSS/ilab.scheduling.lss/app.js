
/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  resource = require('express-resource');

require('express-configure');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));  
});

var labs = app.resource('ilab/labs', require('./resources/lab'));
var reservations = app.resource('reservations', require('./resources/reservation'));
var timeblocks = app.resource('timeblocks', require('./resources/timeblock'));

labs.add(reservations);
labs.add(timeblocks);

app.listen(3000, function(){
  console.log("Lab side scheduling server listening on port %d in %s mode", app.address().port, app.settings.env);
});
