var google = require('../utilities/GoogleClient'),
		lss = require('../utilities/LSSClient'),
		url = require('url');

exports.index = function(req, res){
	
	var labs = [];
	viewLabs(function(result) {
		for (var i in result) {
			if (result[i].title !== "Primary")
				labs.push(result[i]);
		}
		res.json(labs);
	});
};

// POST /ilab/labs 
exports.create = function(req, res){
	res.send("Not Found", 404);
};

exports.show = function(req, res){

	var lab_id = req.params.lab;

 	getLab(lab_id, function(result) {
 		res.json(result);
 	})
};

exports.update = function(req, res){
 	res.send("Not Found", 404);
};

exports.destroy = function(req, res){
  res.send("Not Found", 404);
};


function getLab(lab_id, callback) {
	var lssClient = new lss.LSSClient();

	var requestParam = {
		path: "/ilab/labs/" + lab_id,
  	method: "GET"
	}

	lssClient.sendRequest(requestParam, function(response) {
		callback(JSON.parse(response));
	});
}

function viewLabs(callback) {
	
	var lssClient = new lss.LSSClient();

	var requestParam = {
		path: "/ilab/labs/",
  	method: "GET"
	}

	lssClient.sendRequest(requestParam, function(response) {
		callback(JSON.parse(response));
	});
}

function _parseLab(origin) {
	var objUrl = url.parse(origin.selfLink, false);
	var paths = objUrl.path.split("/");

	var id = paths[paths.length - 1].split("%40")[0];


	var lab = {
		lab_id: id,
		title: origin.title,
		etag: origin.etag,
		selfLink: origin.selfLink,
	}

	return lab;
}