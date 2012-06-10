var google = require('../utilities/GoogleClient'),
		lss = require('../utilities/LSSClient'),
		querystring = require('querystring'),
		url = require('url'),
		mongo_lite = require('mongo-lite'),
		time = require('../utilities/TimeHelper');


const MIN_DURATION = 30;
const MAX_DURATION = 180;
const MAX_DAILY = 3;
const MAX_WEEKLY = 6;
const MAX_MONTHLY = 15;

var db = mongo_lite.connect('mongodb://localhost/ilab_uss');
db.log = null;

exports.index = function(req, res){
	
	var lab_id = req.params.lab;

	var start = req.query.start;
	var end = req.query.end;
	var group_id = req.query.group;
	var user_id = req.query.user;
	
	var params = {
		lab_id: lab_id,
		user_id: user_id,
		group_id: group_id,
		start: start,
		end: end
	}

	listEvents("R", params, function(result) {

		res.json(result);
	});
};


// POST /ilab/labs/{lab_id}/reservations
exports.create = function(req, res){
	console.log("Create reservation");

	console.log(req.body);

	var start = req.body.start;
	var end = req.body.end;

	var reservation = {
		title: "Reservation by " + req.body.user,
		lab_id: req.params.lab,
		timeblock_id: req.body.timeblock_id,
		user_id: req.body.user,
		group: req.body.group,
		uss_id: req.body.uss,
		comment: req.body.comment,
		start: start,
		end: end
	}

	addReservation(reservation, function(result) {
		res.json(result);
	})

};

exports.show = function(req, res){
	var lab_id = req.params.lab;
	var reservation_id = req.params.reservation;	

	var params = {
		lab_id: lab_id,
		reservation_id: reservation_id
	}

	getReservation(params, function(result) {
		res.json(result);
	});

};

// PUT /ilab/labs/{lab_id}/reservations/{reservation_id}
exports.update = function(req, res){
	var lab_id = req.params.lab;
	var reservation_id = req.params.reservation;	

	var params = {
		reservation_id: reservation_id,
		lab_id: lab_id,
		type: "R",
		group: req.body.group,
		uss_id: req.body.uss,
		user_id: req.body.user,
		comment: req.body.comment,
		start: req.body.start,
		timeblock_id: req.body.timeblock_id,
		end: req.body.end
	}

	updateReservation(params, function(result) {
		res.json(result);
	})
};

exports.destroy = function(req, res){
  var lab_id = req.params.lab;
	var reservation_id = req.params.reservation;
	var etag = req.body.etag;

	var params = {
		lab_id: lab_id,
		reservation_id: reservation_id,
		etag: etag
	}	

  deleteReservation(params, function(result) {
  	res.json(result);
  });
};

function getReservation(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + getLabId(params.lab_id) + "@group.calendar.google.com/private/full/" + params.reservation_id + "?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response);

		var reservation = item;

  	callback({ statusCode: 200, reservation: reservation });
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})

}

function listEvents(type, params, callback) {
	
	var gClient = new google.GoogleClient();

	var timeblock_id = params.timeblock_id || "";

	var query = "&start-min=" + params.start +
						  "&start-max=" + params.end +
						  "&q=" + escape("\"type\":\"" + type + "\",\"user_id\":\"" + params.user_id  + "\",\"group_id\":\"" + params.group_id + "\",\"timeblock_id\":\"" + timeblock_id + "\"");

	gClient.sendRequest({
  		path: "/calendar/feeds/" + getLabId(params.lab_id) + "@group.calendar.google.com/private/full?alt=jsonc" + query,
  		method: "GET"
	})

	gClient.on("response", function(buffer) {
		var result = new Array();
		var items = JSON.parse(buffer.response).data.items;
		if (items) {
			for (var i = 0; i < items.length; i++) {
				var reservation = _parseReservation(items[i]);
				result.push(reservation);
			}
  	}

  	callback(result);
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})
}

function addReservation(reservation, callback) {

	checkPolicy(reservation, function(result) {
		if (result.isValid) {
			console.log("\nNo rule violations\n");

			addLSSReservation(reservation, function(result) {
				if (result.statusCode === 201) {
					reservation.reservation_id = result.reservation.reservation_id;
					reservation.timeblock_id = result.reservation.timeblock_id;
					addUSSReservation(reservation, function(reservation) {
						callback({ statusCode: 201, success: true, reservation: reservation, message: "Reservation created." });
					})
				} else {
					callback({ statusCode: 200, success: false, message: result.message });
				}
			});
		} else {
			var violations = result.violations;
			var message = "&nbsp;Reservation policy violated<ul class='violations'>";

			for (var i in violations) {
				message += "<li>" + violations[i] + "</li>";
			}

			message += "</ul>";
										
			callback({ statusCode: 200, success: false, message: message });
		}
	})
}

function addLSSReservation(reservation, callback) {	

	var lssClient = new lss.LSSClient();

	var requestParam = {
		path: "/ilab/labs/" + reservation.lab_id + "/reservations/",
  	method: "POST",
  	content_type: "application/x-www-form-urlencoded",
  	data: reservation
	}

	lssClient.sendRequest(requestParam, function(response) {
		callback(JSON.parse(response));
	});
}

function addUSSReservation(params, callback) {	
	var gClient = new google.GoogleClient();
	
	var details = {
		lab_id: getLabId(params.lab_id),
		reservation_id: params.reservation_id,
		type: "R",
		user_id: params.user_id,
		group_id: params.group,
		timeblock_id: params.timeblock_id,
		uss_id: params.uss_id,
		comment: params.comment
	}

	var reservation = {
	  "data": {
	    "title": params.title,
	    "details": JSON.stringify(details),
	    "transparency": "opaque",
	    "status": "confirmed",
	    "when": [{
	    	"start": convertToUTC(params.start),
	    	"end": convertToUTC(params.end)
	    }]
  	}
	}
	
	gClient.sendRequest({
		path: "/calendar/feeds/" + getLabId(params.lab_id) + "@group.calendar.google.com/private/full?alt=jsonc",
		method: "POST",
		data: reservation
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response).data;
  	callback(_parseReservation(item));
	})

	gClient.on("error", function(e) {
		e.error = "error";
		callback(e);
	})
	
}


function updateReservation(params, callback) {
	params.operation = "update";
	getReservation(params, function(response) {
		params.old_timeblock_id = JSON.parse(response.reservation.data.details).timeblock_id;
		checkPolicy(params, function(result) {
			if (result.isValid) {
				var reservation = response.reservation;
				var reservation_id = params.reservation_id;
				params.reservation_id = JSON.parse(response.reservation.data.details).reservation_id;
				updateLSSReservation(params, function(result) {
					if (result.success) {
						
						var details = {
							lab_id: getLabId(params.lab_id),
							reservation_id: params.reservation_id,
							type: "R",
							user_id: params.user_id,
							group_id: params.group,
							timeblock_id: result.reservation.timeblock_id,
							uss_id: params.uss_id,
							comment: params.comment
						}
						
						reservation.data.details = JSON.stringify(details);
						
						reservation.data.when = [{
							start: convertToUTC(params.start),
							end: convertToUTC(params.end)
						}];
						
						params.reservation_id = reservation_id;
						updateUSSReservation(reservation, params, function(reservation) {
							callback({ statusCode: result.statusCode, success: true, message: "Reservation updated.", reservation: reservation });
						})
					} else {
						callback(result);
					}

				})
			} else {
				var violations = result.violations;
				var message = "&nbsp;Reservation policy violated<ul class='violations'>";

				for (var i in violations) {
					message += "<li>" + violations[i] + "</li>";
				}

				message += "</ul>";

				callback({ statusCode: 200, success: false, message: message });
			}
		})
		
	});
}

function updateUSSReservation(reservation, params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + getLabId(params.lab_id) + "@group.calendar.google.com/private/full/" + params.reservation_id + "?alt=jsonc",
  	method: "PUT",
  	data: reservation
	})

	gClient.on("response", function(buffer) {
		
		var reservation = JSON.parse(buffer.response);
  	callback({ statusCode: 200, success: true, reservation: reservation });

	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})
}

function updateLSSReservation(reservation, callback) {
	var lssClient = new lss.LSSClient();

	var requestParam = {
		path: "/ilab/labs/" + reservation.lab_id + "/reservations/" + reservation.reservation_id,
  	method: "PUT",
  	content_type: "application/x-www-form-urlencoded",
  	data: reservation
	}

	lssClient.sendRequest(requestParam, function(response) {
		callback(JSON.parse(response));
	});
}

function deleteReservation(params, callback) {
	getReservation(params, function(result) {
		var reservation_id = JSON.parse(result.reservation.data.details).reservation_id;
		var lssParams = {
			lab_id: params.lab_id,
			reservation_id: reservation_id
		}
		deleteLSSReservation(lssParams, function(result) {
			if (result.success)
				deleteUSSReservation(params, callback);
		});

	})

}

function deleteUSSReservation(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + getLabId(params.lab_id) + "@group.calendar.google.com/private/full/" + params.reservation_id,
  	method: "DELETE",
  	headers: {
  		etag: params.etag,
  	}
	})

	gClient.on("response", function(buffer) {
		buffer = {
			success: buffer.success,
			status: buffer.statusCode,
		}
  	callback(buffer);
	})

	gClient.on("error", function(e) {
		console.log(e);
  	e.error = "error";
		callback(e);
	})
}

function deleteLSSReservation(params, callback) {
	var lssClient = new lss.LSSClient();

	var requestParam = {
		path: "/ilab/labs/" + params.lab_id + "/reservations/" + params.reservation_id,
  	method: "DELETE",
  	content_type: "application/x-www-form-urlencoded",
  	data: params
	}

	lssClient.sendRequest(requestParam, function(response) {
		callback(JSON.parse(response));
	});
}

function checkPolicy(params, callback) {

	console.log("\nCheck policy \n");
	getRules({ group_id: params.group, timeblock: params.timeblock_id, lab_id: params.lab_id }, function(rule) {
		if (rule) {

		} else {
			rule = {
				min_duration: MIN_DURATION,
				max_duration: MAX_DURATION,
				max_daily: MAX_DAILY,
				max_weekly: MAX_WEEKLY,
				max_monthly: MAX_MONTHLY
			}
		}

		var duration = (new Date(params.end) - new Date(params.start)) / 60000;

		var isValid = true;
		var violations = [];

		if (duration > rule.max_duration)
			violations.push("Maximum allowed length is " + rule.max_duration + " minutes. ");

		if (duration < rule.min_duration)
			violations.push("Minimum allowed length is " + rule.min_duration + " minutes. ");

		var _params = {
			lab_id: params.lab_id,
			user_id: params.user_id,
			group_id: params.group,
			timeblock_id: params.timeblock_id,
			start: convertToUTC((new Date(params.start)).setHours(0, 0)),
			end: convertToUTC((new Date(params.end)).setHours(23, 59))
		}

		var addition;
		if (params.operation === 'update')
			if (params.old_timeblock_id === params.timeblock_id)
				addition = 0;
			else 
				addition = 1;
		else 
			addition = 1;

		listEvents("R", _params, function(result) {
			var numReservations = result.length;
			console.log(numReservations);
			if (numReservations + addition > rule.max_daily)
				violations.push("Maximum reservations a day is " + rule.max_daily);

			if (violations.length > 0)
				isValid = false;

			console.log(violations);
			callback({ "isValid": isValid, "statusCode": 200, violations: violations })
			
		});		
	})

	;
}

function _parseReservation(origin) {

	var objUrl = url.parse(origin.selfLink, false);
	var paths = objUrl.path.split("/");

	var id = paths[paths.length - 1];

	var reservation = {
		reservation_id: id,
		selfLink: origin.selfLink,
		title: origin.title,
		details: origin.details,
		when: origin.when,
		etag: origin.etag
	}

	return reservation;
}

function convertToUTC(localTime, timeDiff) {
  return new Date(localTime).toISOString();
}

function getLabId(lss_lab_id) {
	return global.labs[lss_lab_id].uss_lab_id
}

function getRules(params, callback) {
	var db = mongo_lite.connect('mongodb://localhost/ilab_uss');
	db.log = null;
	db.rules = db.collection('rules');
	console.log(params);
	db.rules.first({ lab_id: params.lab_id, group_id: params.group_id, timeblock: params.timeblock }, function(err, rule) {

		if(!err) 
			callback(rule);
		else
			callback(err);
	})
}