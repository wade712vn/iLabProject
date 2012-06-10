var request = require('request'),
		querystring = require('querystring'),
		mongo_lite = require('mongo-lite');

var db = mongo_lite.connect('mongodb://localhost/ilab_client');
db.log = null;
db.users = db.collection('users');
db.groups = db.collection('groups');
db.labs = db.collection('labs');

var labServers = [];

db.labs.all(function(err, labs) {
	for (var i in labs) {
		labServers[labs[i].lab_id] = labs[i];
	}
}); 

exports.index = function(req, res) {
	authorization(req, res, function(user) {
		var listGroups= [];
		db.groups.all(function(err, groups) {
			for (var i in groups) {
				var group = groups[i];
				if (group.users.indexOf(user.username) !== -1) {
					listGroups.push(group);
					
					for (var j in group.labs) {
						var lab = labServers[group.labs[j]];
						group.labs[j] = lab;
					}
				}
			}

			res.render('index.jade', { title: 'iLab ', user: user, groups: listGroups, layout: false });
		});

  	
	});
};

exports.login = function(req, res) {
  res.render('login', { title: 'Login', layout: false, redirect_url: req.query.redirect_url });
};

exports.logout = function(req, res) {
	delete req.session.user;
	res.redirect('/login');
}

exports.doLogin = function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var redirect_url = req.body.redirect_url;

  if (redirect_url === undefined)
  	redirect_url = "/";

  validateUser(username, password, function(result) {
  	if (result.success) {
  		req.session.user = result.user;
		  res.redirect('' + redirect_url);		
  	} else {
  		res.redirect('/login');	
  	}
  })

  
};

exports.reservation = function(req, res) {
	authorization(req, res, function(user) {
		var group_id = req.query.group;
		
		var lab_id = req.params.lab_id;
		var lab = labServers[lab_id];
		res.render('make-reservation', { title: 'USS - Lab Reservation', lab: lab, user: user, group_id: group_id, layout: false });
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
		console.log(e);
	}

	console.log(method + "\t" + url + "\n");
	console.log(data || "");
	console.log("\n");

	
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

function validateUser(username, password, callback) {
	
	db.users.first({ username: username, password: password }, function(err, user) {
	  if (user) {
	    callback({ success: true, user: user });
	    console.log("User %s logged in", username);
	  } else {
	    callback({ success: false });
	  }

	});
}


function authorization(req, res, callback) {
	if (req.session.user) {
		callback(req.session.user);
	} else {
		var redirect_url = req.url;
		res.redirect('/login?redirect_url=' + redirect_url);
	}

}