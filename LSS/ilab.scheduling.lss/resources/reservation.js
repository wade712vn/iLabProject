var google = require('../utilities/GoogleClient'),
		querystring = require('querystring'),
		url = require('url'),
		time = require('../utilities/TimeHelper'),
		step = require('step');

var count = 0;
var locked = false;

exports.index = function(req, res){
	console.log("\nView reservations\n");
	var lab_id = req.params.lab;

	var start = req.query.start;
	var end = req.query.end;
	
	var params = {
		lab_id: lab_id,
		group_id: "",
		start: start,
		end: end
	}

	listEvents("R", params, function(result) {
		res.json(result);
	});
};


// POST /ilab/labs/{lab_id}/reservations
exports.create = function(req, res){
  console.log("\nCreate reservation\n");
	var start = req.body.start;
	var end = req.body.end;
	var group = req.body.group;

	var reservation = {
		title: req.body.title,
		lab_id: req.params.lab,
		group_id: group,
		uss_id: req.body.uss,
		timeblock_id: req.body.timeblock_id,
		comment: req.body.comment,
		when: [
			{
				"start": start,
				"end": end
			}
		]
	}

	var params = {
		lab_id: req.params.lab,
		group_id: group,
		start: convertToUTC(req.body.start),
		end: convertToUTC(req.body.end),
		timeblock_id: req.body.timeblock_id
	}

	listEvents("", params, function(result) {

		if (!result.error) {
			
			if (result.length > 1) {			
				res.json({ statusCode: 200, message: "Cannot add reservation.", success: false });
				
			} else if (result.length < 1) {
				res.json({ statusCode: 200, message: "Cannot add reservation.", success: false });
				
			} else {
				var event = result[0];
				var type = JSON.parse(event.details).type;

				if (type !== "R") {
					var timeblock_id = event.reservation_id;
					
					if ((new Date(event.when[0].start) <= new Date(start)) && 
							(new Date(event.when[0].end) >= new Date(end))) {
							reservation.timeblock_id = timeblock_id;
							
							step(
								function addRersv() {
									addReservation(reservation, this)
								},
								function returnResult (result) {
							
									res.json({ statusCode: 201, reservation: result, success: true });
									
								}
							)

					} else {
						res.json({ statusCode: 200, message: "Cannot add reservation.", success: false });
						
					}
				} else {
					res.json({ statusCode: 200, message: "Cannot add reservation.", success: false });
					
 				}
			}
		} else {
			res.json("Error");
			
		} 
	});
	
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
	console.log("\nUpdate Reservation\n")
	var lab_id = req.params.lab;
	var reservation_id = req.params.reservation;	

	var details = {
		lab_id: lab_id,
		type: "R",
		group_id: req.body.group,
		uss_id: req.body.uss,
		comment: req.body.comment
	}

	var reservation = {
		details: JSON.stringify(details),
		when: [
			{
				"start": convertToUTC(req.body.start),
				"end": convertToUTC(req.body.end)
			}
		]
	}

	var params = {
		lab_id: lab_id,
		reservation_id: reservation_id,
		reservation: reservation,
		group_id: req.body.group,
		start: convertToUTC(req.body.start),
		end: convertToUTC(req.body.end),
	}

	checkOverlapping(params, function(valid, timeblock_id) {
		if (valid) {
			params.timeblock_id = timeblock_id;
			updateReservation(params, function(result) {
				res.json(result);
			});
		} else {
			res.json({ status: 200, message: "Cannot update reservation", success: false });
		}

	})
	
};

exports.destroy = function(req, res){
	console.log("\nDelete reservation\n")
  var lab_id = req.params.lab;
	var reservation_id = req.params.reservation;
	var etag = req.body.etag;

	var params = {
		lab_id: lab_id,
		reservation_id: reservation_id,
		etag: etag
	}	

	if (etag) {
	  deleteReservation(params, function(result) {
	  	res.json(result);
	  });

	} else {
		getReservation(params, function(result) {
			if (result.statusCode == 200) {
				params.etag = result.reservation.etag;
				deleteReservation(params, function(result) {
	  			res.json(result);
	  		});
			} else {
				res.json({ message: "Cannot delete" });
			}

		}) 
	}
};

function getReservation(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.reservation_id + "?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response).data;

		var result = { statusCode: 200, reservation: _parseReservation(item) };

  	callback(result);
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})

}

function listEvents(type, params, callback) {
	
	var gClient = new google.GoogleClient();
  
	var query = "&start-min=" + params.start +
						  "&start-max=" + params.end +
						  "&q=" + escape("\"type\":\"" + type + "\",\"group_id\":\"" + params.group_id + "\"");

	gClient.sendRequest({
  		path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full?alt=jsonc" + query,
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

function checkOverlapping(params, callback) {
	console.log("\nCheck overlapping\n");
	listEvents("", params, function(result) {
		console.log(params);
		if (!result.error) {
			
			if (result.length > 2) {
				callback(false);
			} else if (result.length < 1) {
				callback(false);
			} else if (result.length == 1) {
					
				var event = result[0];
				var type = JSON.parse(event.details).type;

				if (type !== "R") {
					var timeblock_id = event.reservation_id;
					if ((new Date(event.when[0].start) <= new Date(params.start)) && 
							(new Date(event.when[0].end) >= new Date(params.end))) {

							callback(true, timeblock_id);
					} else {
						callback(false);
					}
				} else {
					callback(false);
 				}
			} else {
				var valid = true;
				var timeblock_id;
				for (var i in result) {
					var event = result[i];
					var type = JSON.parse(event.details).type;
					
					if (type === "T") {
						timeblock_id = event.reservation_id;
						if (!((new Date(event.when[0].start) <= new Date(params.start)) && 
							(new Date(event.when[0].end) >= new Date(params.end)))) {
							valid = false;
						}
					} else {

						if (params.reservation_id !== result[i].reservation_id)
							valid = false;
					}
				}
				if (valid)
					callback(true, timeblock_id);
				else
					callback(false);
			}
		} else {	
			console.log(result.error);
			callback(false);
		} 
	});
}

function addReservation(params, callback) {

	var gClient = new google.GoogleClient();

	var details = {
		lab_id: params.lab_id,
		timeblock_id: params.timeblock_id,
		type: "R",
		group_id: params.group_id,
		uss_id: params.uss_id,
		comment: params.comment,
	}

	var reservation = {
	  "data": {
	    "title": params.title,
	    "details": JSON.stringify(details),
	    "transparency": "opaque",
	    "status": "confirmed",
	    "when": [{
	    	"start": convertToUTC(params.when[0].start),
	    	"end": convertToUTC(params.when[0].end)
	    }]
  	}
	}
	
	gClient.sendRequest({
		path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full?alt=jsonc",
		method: "POST",
		data: reservation
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response).data;
		var reservation = _parseReservation(item);
		reservation.timeblock_id = params.timeblock_id;
  	callback(reservation);
	})

	gClient.on("error", function(e) {
		e.error = "error";
		callback(e);
	})
}

function updateReservation(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.reservation_id + "?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var reservation = JSON.parse(buffer.response);

		reservation.data.details = params.reservation.details;
		reservation.data.when = params.reservation.when;
		
  	_updateReservation(params, reservation, callback);
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})
}

function _updateReservation(params, data, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.reservation_id + "?alt=jsonc",
  	method: "PUT",
  	data: data
	})

	gClient.on("response", function(buffer) {
		
		var reservation = JSON.parse(buffer.response);
		reservation.timeblock_id = params.timeblock_id;

  	callback({ statusCode: 200, success: true, reservation: reservation });
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})

}

function deleteReservation(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.reservation_id,
  	method: "DELETE",
  	headers: {
  		etag: params.etag,
  	}
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
  	e.error = "Cannot delete reservation";
		callback(e);
	})
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
		etag: origin. etag
	}

	return reservation;
}

function convertToUTC (localTime, timeDiff) {
  return new Date(localTime).toISOString();
}