var request = require('request'),
		querystring = require('querystring'),
		mongo_lite = require('mongo-lite');

var db = mongo_lite.connect('mongodb://localhost/ilab_client');
db.log = null;

db.groups = db.collection('groups');
db.labs = db.collection('labs');

var labServers = [];

db.labs.all(function(err, labs) {
	for (var i in labs) {
		labServers[labs[i].lab_id] = labs[i];
	}
}); 

exports.index = function(req, res){
	authorization(req, res, function(group) {
		var listLabs = [];
		for (var i in group.labs) {

			var lab = labServers[group.labs[i]];
			listLabs.push(lab);
			
		}
		
		res.render('index', { title: 'iLab User-side Admin', group: group, listLabs: listLabs, layout: false  });
	})
  
};

exports.login = function(req, res) {
  res.render('login', { title: 'Login', layout: false, redirect_url: req.query.redirect_url });
};

exports.logout = function(req, res) {
	delete req.session.group;
	res.redirect('/login');
}

exports.doLogin = function(req, res) {
  var group_id = req.body.group_id;
  var password = req.body.password;
  var redirect_url = req.body.redirect_url;

  if (redirect_url === undefined)
  	redirect_url = "/";

  validateUser(group_id, password, function(result) {
  	if (result.success) {
  		req.session.group = result.group;
		  res.redirect('' + redirect_url);		
  	} else {
  		res.redirect('/login');	
  	}
  })
  
};

exports.admin = function(req, res) {
	authorization(req, res, function(group) {
		res.render('admin', { title: 'USS - Admin', group: group, lab_id: req.params.lab_id, layout: false });
	});
}

exports.rules = function(req, res) {
	authorization(req, res, function(group) {

		var params = {
			lab_id: req.params.lab_id,
			group_id: group.group_id,
		}

		getTimeblocks(params, function(result) {

			var timeblocks = JSON.parse(result.timeblocks).timeblocks;
			for (var i in timeblocks) {
				var rrules = {};
				var timeblock = timeblocks[i];
				
				if (timeblock.recurrence) {
					var rules = timeblock.recurrence.split("\r\n");

					var start = rules[0].substring(rules[0].length - 15);
					var end = rules[1].substring(rules[1].length - 15);

	        var array = (rules[2].replace("RRULE:", "")).split(";");
	        for ( var i in array) {
	          rrules[array[i].split("=")[0]] = array[i].split("=")[1];
	        };
	        rrules.UNTIL = formatDateString(rrules.UNTIL);
	        timeblock.recurrence = rrules;
	        
	      	console.log(start);
	      	timeblock.start_date = formatDateString(start);
	        timeblock.start_time = start.substring(start.length - 6, start.length - 2);
	        timeblock.end_time = end.substring(end.length - 6, end.length - 2);
        } else {

        	timeblock.start_date = formatDateString(timeblock.when[0].start.substring(0, 10).replace(/-/gi, ""));
        	timeblock.start_time = timeblock.when[0].start.substring(11, 16).replace(/:/gi, "");
        	timeblock.end_time = timeblock.when[0].end.substring(11, 16).replace(/:/gi, "");
        	timeblock.recurrence = {
        		FREQ: "ONCE",
        		UNTIL: ""
        	}

      	}

			}
			
			res.render('manage-rules', { title: 'USS - Manage Rules', group: group, timeblocks: timeblocks, lab_id: req.params.lab_id, layout: false });
		})
		
	});
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

	var data = req.body.data;

	try {
		data = JSON.parse(data);
	} catch (e) {
		console.log("Error");
		console.log(e);
	}
	
	console.log(method + "\t" + url + "\n");
	console.log(data || "");

	request({
		headers: {
			'content-type' : req.body.content_type
		},
		url: url + query,
		method: method,
		json: data
	}, 
		function(error, response, body) {

			if (!error) {
				res.json(body);
			} else {
				res.json(error);
			}

		}
	);

}

function validateUser(group_id, password, callback) {
	db.groups.findOne({ group_id: group_id, password: password }, function(err, group) {
		if (group) {
	    callback({ success: true, group: group });
	    console.log("Group admin of %s logged in", group_id);
	  } else {
	    callback({ success: false });
	  }
	})
}

function authorization(req, res, callback) {
	if (req.session.group) {
		callback(req.session.group);
	} else {
		var redirect_url = req.url;
		res.redirect('/login?redirect_url=' + redirect_url);
	}

}

function getTimeblocks(params, callback) {
	request({
		headers: {
			'content-type' : 'application/x-www-form-urlencoded'
		},
		url: "http://127.0.0.1:2000/ilab/labs/" + params.lab_id + "/timeblocks?group=" + params.group_id,
		method: "GET",
	}, 
		function(error, response, body) {
			if (!error && response.statusCode == 200) {
				callback({ success: true, timeblocks: body });
			} else {
				callback({ success: false, error: error });
			}
		}
	);
}

function formatDateString (str) {
  var date = str.substring(6, 8) + "/" + str.substring(4, 6) + "/" + str.substring(0, 4);
  return date;
}


