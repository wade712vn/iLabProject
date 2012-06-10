var google = require('../utilities/GoogleClient'),
		lss = require('../utilities/LSSClient'),
		querystring = require('querystring'),
		url = require('url'),
		time = require('../utilities/TimeHelper');

exports.index = function(req, res){
	console.log("View time blocks");
	var lab_id = req.params.lab;
	
	var group_id = req.query.group;
	var start = req.query.start;
	var end = req.query.end;

	if (!start) {
		start = new Date();
		start = start.toISOString();
	}

	if (!end) {
		end = new Date();
		end.setYear(end.getFullYear() + 1);
		end = end.toISOString();
	}

	var params = {
		lab_id: lab_id,
		group_id: group_id,
		start: start,
		end: end
	}
	console.log(params);
	listTimeblocks(params, function(result) {
		console.log(result);
		res.json({ statusCode: 200, timeblocks: result.timeblocks });
	});
	
};

exports.create = function(req, res){
  
  res.send("Not Found", 404)

};

exports.show = function(req, res){
  var lab_id = req.params.lab;
	var timeblock_id = req.params.timeblock;	

	var params = {
		lab_id: lab_id,
		timeblock_id: timeblock_id
	}

	getTimeBlock(params, function(result) {
		res.json(result);
	});
};

exports.update = function(req, res){
  res.send("Not Found", 404)
};

exports.destroy = function(req, res){
	res.send("Not Found", 404)
};

function getTimeBlock(params, callback) {
	var lssClient = new lss.LSSClient();

	var lab_id = req.params.lab;

	var requestParam = {
		path: "/ilab/labs/" + lab_id + "/timeblocks/" + params.timeblock_id,
  	method: "GET"
	}

	lssClient.sendRequest({
  	
	}, function() {

	});
}

function listTimeblocks(params, callback) {

	var lssClient = new lss.LSSClient();

	var lab_id = params.lab_id;
	var group_id = params.group_id;
	var query = "?";

	var start = params.start;
	var end = params.end;

	query += "start=" + start + "&end=" + end + "&group=" + group_id;

	var requestParam = {
		path: "/ilab/labs/" + lab_id + "/timeblocks/" + query,
  	method: "GET"
	}

	lssClient.sendRequest(requestParam, function(response) {
		callback(JSON.parse(response));
	});
}

function _parseTimeBlock(origin) {
	var objUrl = url.parse(origin.selfLink, false);
	var paths = objUrl.path.split("/");

	var id = paths[paths.length - 1];

	var timeblock = {
		timeblock_id: id,
		selfLink: origin.selfLink,
		title: origin.title,
		details: origin.details,
		when: origin.when,
		etag: origin.etag,
		recurrence: origin.recurrence
	}

	return timeblock;
}

function dateToString (date) {
  var date = new Date(date);
  
  date.setHours(date.getHours() + 10);					 
  
  var string = date.toISOString();
  string = string.replace(/-/gi, "").replace(/:/gi,"").replace(".000Z","");
  return string;
} 

function convertToUTC (localTime, timeDiff) {
  return new Date(localTime).toISOString();
}