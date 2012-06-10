var google = require('../utilities/GoogleClient'),
		url = require('url');

exports.index = function(req, res){
	
	viewLabs(function(result) {
		res.json(result);
	});
};


// POST /ilab/labs 
exports.create = function(req, res){

	var params = {
		title: req.body.title,
		lss_id: req.body.lss_id,
		institution: req.body.institution,
		lab_description: req.body.lab_description
	}

	console.log(params);

	addLab(params, function(result) {
		res.json(result);
	});
 	
};

exports.show = function(req, res){
 	var lab_id = req.params.lab;

 	viewLab(lab_id, function(result) {
 		res.json(result);
 	})
};

exports.update = function(req, res){
 	
};

exports.destroy = function(req, res){
  var lab_id = req.params.lab;

  deleteLab(lab_id, function(result) {
  	res.json(result);
  });
};

function addLab(params, callback) {

	var details = {
		lss_id: params.lss_id,
		institution: params.institution,
		lab_description: params.lab_description
	}

	var lab = {
		title: params.title,
		details: JSON.stringify(details),
		timeZone: "Australia/Brisbane",
	}

	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/default/allcalendars/full?alt=jsonc",
  	method: "POST", 
  	data: lab
	})

	gClient.on("response", function(buffer) {

  	callback(buffer);
	})

	gClient.on("error", function(e) {
		callback(e);
	})
}

function viewLab(lab_id, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + lab_id + "@group.calendar.google.com/private/full/?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response).data;

		var result = { statusCode: 200, timeblock: _parseLab(item) };

  	callback(result);
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})
}


function viewLabs(callback) {
	
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/default/allcalendars/full?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {

		var items = JSON.parse(buffer.response).data.items;
  	for (var i in items) {
  		items[i] = _parseLab(items[i]);
  	}
  	callback(items);
	})

	gClient.on("error", function(e) {
		callback(e);
	})
}

function deleteLab(lab_id, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/default/owncalendars/full/" + lab_id + "@group.calendar.google.com",
  	method: "DELETE",
	})

	gClient.on("response", function(buffer) {
		result = {
			success: buffer.success,
			status: buffer.statusCode,
		}
  	callback(result);
	})

	gClient.on("error", function(e) {
		console.log(e);
  	e.error = "error";
		callback(e);
	})
}

function _parseLab(origin) {
	console.log(origin);
	var objUrl = url.parse(origin.selfLink, false);
	var paths = objUrl.path.split("/");

	var id = paths[paths.length - 1].split("%40")[0];


	var lab = {
		lab_id: id,
		title: origin.title,
		details: origin.details,
		etag: origin.etag,
		selfLink: origin.selfLink,
	}

	try {
		lab.details = JSON.parse(lab.details);
	} catch (e) {
		console.log(e);
	}

	return lab;
}