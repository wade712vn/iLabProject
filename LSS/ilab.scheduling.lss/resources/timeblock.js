var google = require('../utilities/GoogleClient'),
		querystring = require('querystring'),
		url = require('url'),
		time = require('../utilities/TimeHelper');

exports.index = function(req, res){

	var lab_id = req.params.lab;
	var group_id = req.query.group;
	var start = req.query.start;
	var end = req.query.end;

	var params = {
		lab_id: lab_id,
		group_id: group_id,
		start: start,
		end: end
	}
	console.log("View time blocks \n");
	
	listTimeblocks(params, function(result) {

		res.json(result);
	});
	
};

exports.create = function(req, res){
  console.log("Create time block \n");
	console.log(req.body);

  var timeblock = {
		title: "Timeblock",
		lab_id: req.params.lab,
		group_id: req.body.group,
		uss_id: req.body.uss,
		comment: req.body.comment,
		when: [
			{
				"start": req.body.start,
				"end": req.body.end
			}
		]
	}

	if (req.body.recurrence_type !== undefined && req.body.recurrence_type !== '') {

		timeblock.recurrence_type = req.body.recurrence_type;
		timeblock.recurrence_end = req.body.recurrence_end;
		
	}

	var params = {
		lab_id: req.params.lab,
		timeblock_id: "",
		group_id: "",
		local_start: req.body.start,
		local_end: req.body.end,
		start: convertToUTC(req.body.start),
		end: convertToUTC(req.body.end)
	}


	if (timeblock.recurrence_type !== undefined && timeblock.recurrence_type !== '') {
		var until = timeblock.recurrence_end.substring(0, 8);
		var date = until.substring(0, 4) + "-" + until.substring(4, 6) + "-" + until.substring(6, 8);
		var endDate = date + params.end.substring(10);
		params.end = endDate;
	}
	
	checkOverlapping(params, timeblock, function(result) {
		if (result) {
			addTimeblock(timeblock, function(result) {
				res.json({ status: 201, message: "Time block added successfully", timeblock: result, success: true });
			})
		} else {
			res.json({ status: 200, message: "Cannot add block", success: false });
		}
	});

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
	console.log("\nUpdate time block \n");

  var lab_id = req.params.lab;
	var timeblock_id = req.params.timeblock;	

	var details = {
		lab_id: lab_id,
		type: "T",
		group_id: req.body.group,
		uss_id: req.body.uss,
		comment: req.body.comment
	}

	var timeblock = {
		title: req.body.title,
		details: JSON.stringify(details),
		when: [
			{
				"start": convertToUTC(req.body.start),
				"end": convertToUTC(req.body.end)
			}
		],
		recurrence_type: req.body.recurrence_type,
		recurrence_end: req.body.recurrence_end,
		start: req.body.start,
		end: req.body.end
	}

	var params = {
		lab_id: lab_id,
		group_id: "",
		timeblock_id: timeblock_id,
		local_start: req.body.start,
		local_end: req.body.end,
		start: convertToUTC(req.body.start),
		end: convertToUTC(req.body.end),
		timeblock: timeblock,
	}

	if (timeblock.recurrence_type !== undefined && timeblock.recurrence_type !== '') {
		var until = timeblock.recurrence_end.substring(0, 8);
		var date = until.substring(0, 4) + "-" + until.substring(4, 6) + "-" + until.substring(6, 8);
		var endDate = date + params.end.substring(10);
		params.end = endDate;
	}

	checkOverlapping(params, timeblock, function(result) {
		if (result) {
			
			updateTimeBlock(params, function(result) {
				if (result.success) {
					result.message = "Time block updated successfully";
					res.json(result);
				}
			});
		} else {
			res.json({ status: 200, message: "Cannot update time block", success: false });
		}
	});
	
};

exports.destroy = function(req, res){
	var lab_id = req.params.lab;
	var timeblock_id = req.params.timeblock;
	var etag = req.body.etag;

	var params = {
		lab_id: lab_id,
		timeblock_id: timeblock_id,
		etag: etag
	}	

  deleteTimeBlock(params, function(result) {
  	res.json(result);
  });
};

function getTimeBlock(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.timeblock_id + "?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response).data;

		var result = { statusCode: 200, timeblock: _parseTimeBlock(item) };

  	callback(result);
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})

}

function listTimeblocks(params, callback) {

	var gClient = new google.GoogleClient();
  
	var query = "&start-min=" + params.start +
						  "&start-max=" + params.end +
						  "&q=" + escape("\"type\":\"T\",\"group_id\":\"" + params.group_id + "\"");

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full?alt=jsonc" + query,
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var result = new Array();
		
		var items = JSON.parse(buffer.response).data.items;
		if (items) {
			for (var i = 0; i < items.length; i++) {
				var timeblock = _parseTimeBlock(items[i]);
				result.push(timeblock);
			}
  	}
  	callback({ statusCode: 200, timeblocks: result });
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})
}

function checkPolicy(params, callback) {

}

function addTimeblock(params, callback) {

	var gClient = new google.GoogleClient();

	var details = {
		lab_id: params.lab_id,
		type: "T",
		group_id: params.group_id,
		uss_id: params.uss_id,
		comment: params.comment
	}

	var timeblock = {
	  "data": {
	    "title": params.title,
	    "details": JSON.stringify(details),
	    "transparency": "transparent",
	    "status": "confirmed",
	    "recurrence": null,
			"when": null,
		},

	};
	if (params.recurrence_type !== undefined && params.recurrence_type !== '' ) {
		
		var recurrence = generateRecurrence(params.when, params.recurrence_type, params.recurrence_end);
		timeblock.data.recurrence = recurrence;
		delete timeblock.data.when;

	} else {
		
		timeblock.data.when = [{
    	"start": convertToUTC(params.when[0].start),
    	"end": convertToUTC(params.when[0].end)
    }];
    delete timeblock.data.recurrence;
	  	
	}
	
	gClient.sendRequest({
		path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full?alt=jsonc",
		method: "POST",
		data: timeblock
	})

	gClient.on("response", function(buffer) {
		var item = JSON.parse(buffer.response).data;
  	callback(_parseTimeBlock(item));
	})

	gClient.on("error", function(e) {
		e.error = "error";
		callback(e);
	})
	
}

function checkOverlapping(params, timeblock, callback) {
	listTimeblocks(params, function(result) {
		if (!result.timeblocks.error) {
			var whens = [];
			if (result.timeblocks.length > 0) {
				for (var i in result.timeblocks) {
					var block = _parseTimeBlock(result.timeblocks[i]);
					for (var j in block.when) {

						var when = block.when[j];
						var func = null;
						switch (timeblock.recurrence_type) {
							case "WEEKLY":
								func = computeWeekMins;
								break;
							case "DAILY":
								func = computeDayMins;
								break;
							case "MONTHLY":
								func = computeMonthMins;
								break;
							case undefined:
							case '':
								func = computeDayMins;
								break;
						}
						var s1 = func(params.local_start);
						var s2 = func(when.start);
						var e1 = func(params.local_end);
						var e2 = func(when.end);
						
						if (s1 >= e2 || e1 <= s2) {
															
						} else {
							if (params.timeblock_id !== block.timeblock_id)
								whens.push(block.when[j]);
						}
					}
				}
				if (whens.length > 0) {
					callback(false);
				} else {
					callback(true);
				}
			} else {
				callback(true);
			}
		} else {	
			res.json({ error: result });
		} 
	});
}

function updateTimeBlock(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.timeblock_id + "?alt=jsonc",
  	method: "GET"
	})

	gClient.on("response", function(buffer) {
		var timeblock = JSON.parse(buffer.response);

		timeblock.data.details = params.timeblock.details;

		if (params.timeblock.recurrence_type === '') {
			delete timeblock.data.recurrence;	
			timeblock.data.when = params.timeblock.when;
		} else {
			
			timeblock.data.recurrence = updateRecurrence(timeblock.data.recurrence, {"recurrence_type": params.timeblock.recurrence_type, "recurrence_end": params.timeblock.recurrence_end, "start": params.timeblock.start, "end": params.timeblock.end })	
		}
		
  	_updateTimeBlock(params, timeblock, callback);
	})

	gClient.on("error", function(e) {
  	e.error = "error";
		callback(e);
	})
}

function _updateTimeBlock(params, data, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.timeblock_id + "?alt=jsonc",
  	method: "PUT",
  	data: data
	})

	gClient.on("response", function(buffer) {
		var timeblock = _parseTimeBlock(JSON.parse(buffer.response).data);
  	callback({ statusCode: 200, timeblock: timeblock, success: true });
	})

	gClient.on("error", function(e) {
		callback({ statusCode: 200, error: e, success: false });
	})

}

function deleteTimeBlock(params, callback) {
	var gClient = new google.GoogleClient();

	gClient.sendRequest({
  	path: "/calendar/feeds/" + params.lab_id + "@group.calendar.google.com/private/full/" + params.timeblock_id,
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
  	e.error = "error";
		callback(e);
	})
}

function _parseTimeBlock(origin) {
	var objUrl = url.parse(origin.selfLink, false);
	var paths = objUrl.path.split("/");

	var id = paths[paths.length - 1];

	var timeblock = {
		timeblock_id: id,
		title: origin.title,
		details: origin.details,
		when: origin.when,
		etag: origin.etag,
		recurrence: origin.recurrence,
		selfLink: origin.selfLink
	}

	return timeblock;
}

function generateRecurrence(when, type, until) {

	var recurrence = "";
	var start = dateToString(when[0].start);
	var end = dateToString(when[0].end);
	recurrence += "DTSTART;TZID=Australia/Brisbane:" + start + "\r\n" +
 						    "DTEND;TZID=Australia/Brisbane:" + end + "\r\n";
	
 	recurrence += "RRULE:FREQ=" + type + ((until === '') ? "" : ";UNTIL=" + until);					 

	return recurrence;
}

function updateRecurrence(recurrence, update) {
	var newRecurrence = "";
	var start = dateToString(update.start);
	var end = dateToString(update.end);

	var rrules = {};
  if (recurrence) {
    var rules = recurrence.split("\r\n");
    rules[0] = rules[0].substring(0, rules[0].length - 6) + start.substring(9);
    rules[1] = rules[1].substring(0, rules[1].length - 6) + end.substring(9);
    rules[2] = "RRULE:FREQ=" + update.recurrence_type + ((update.recurrence_end === '') ? "" : ";UNTIL=" + update.recurrence_end);			

    for (var i in rules) {
    	newRecurrence += rules[i] + "\r\n";
    }
  } else {
  	newRecurrence = generateRecurrence([{ start: update.start, end: update.end }], update.recurrence_type, update.recurrence_end);
  }

	return newRecurrence;
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

function computeWeekMins(datetime) {
	var datetime = new Date(datetime);
	var days = datetime.getDay();
	var mins = datetime.getHours() * 60 + datetime.getMinutes();
	
	return days * 24 * 60 + mins;
}

function computeDayMins(datetime) {
	var datetime = new Date(datetime);
	var mins = datetime.getHours() * 60 + datetime.getMinutes();
	
	return mins;
}

function computeMonthMins(datetime) {
	var datetime = new Date(datetime);
	var days = datetime.getDate();
	var mins = datetime.getHours() * 60 + datetime.getMinutes();
	
	return days * 24 * 60 + mins;
}