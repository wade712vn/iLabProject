var request = require('request'),
		querystring = require('querystring'),
		url = require('url');



exports.index = function(req, res) {

	getLabs(function(labs) {
		labs = JSON.parse(labs);
		for (var i in labs) {
			labs[i] = _parseLab(labs[i]);
		}
		res.render('index', { title: 'iLab LSS Management', labs: labs, layout: false });
	})		
	
};

exports.timeblock = function(req, res) {
	res.render('manage-timeblock', { title: 'LSS - Timeblocks Management', lab_id: req.params.lab_id, layout: false });
}

exports.reservation = function(req, res) {
	res.render('manage-reservation', { title: 'LSS - Reservations Management', lab_id: req.params.lab_id, layout: false });
}

exports.ajax = function(req, res) {

	var date = new Date();
	var d = date.getDate();
	var m = date.getMonth();
	var y = date.getFullYear();

	var method = req.body.method;
	var url = req.body.url;

	var queries = req.body.query;
	var query = "?";
	for (var key in queries) {
		query += key + "=" + queries[key] + "&";
	}
	try {
		var data = req.body.data;
	} catch (e) {
		console.log(e);
	}

	console.log(method + "\t" + url + "\n");
	console.log(data || "");
	
	request({
		headers: {
			'content-type' : req.body.content_type,
		},
		url: url + query,
		method: method,
		json: data
	}, 
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				res.json(body);
			}
		}
	);

}

function getLabs(callback) {
	request({
		headers: {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url: "http://127.0.0.1:3000/ilab/labs",
		method: "GET",
	}, 
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				callback(body);
			} else {
				callback(error);
			}
		}
	);
}

function _parseLab(origin) {
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

	return lab;
}

