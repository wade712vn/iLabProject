var querystring = require('querystring'),
		mongo_lite = require('mongo-lite');

const MIN_DURATION = 30;
const MAX_DURATION = 180;
const MAX_DAILY = 3;
const MAX_WEEKLY = 6;
const MAX_MONTHLY = 15;

var db = mongo_lite.connect('mongodb://localhost/ilab_uss');
db.log = null;

db.rules = db.collection('rules');

exports.index = function(req, res){
	var lab_id = req.params.lab;	
	var group_id = req.query.group;
	var timeblock = req.query.timeblock || "";
	timeblock = timeblock.replace("?", "").replace("/","");

	var params = {
		lab_id: lab_id,
		group_id: group_id,
		timeblock: timeblock
	}

	getRules(params, function(rule) {
		if (rule == null) {
			rule = {
				_id: "",
				lab_id: "nk3fgtn5tb9o20pth2q0bh5k1s",
				group_id: "G001",
				min_duration: MIN_DURATION,
				max_duration: MAX_DURATION,
				max_daily: MAX_DAILY,
				max_weekly: MAX_WEEKLY,
				max_monthly: MAX_MONTHLY
			}
		} 

		res.json(rule)
	})
};

exports.create = function(req, res){
	var lab_id = req.params.lab;	
	var group_id = req.query.group;
	var timeblock = req.query.timeblock.replace("?", "").replace("/","");

	console.log(req.body);

 	var params = {
		lab_id: lab_id,
		group_id: group_id,
		timeblock: timeblock,
		min_duration: req.body.min_duration,
		max_duration: req.body.max_duration,
		max_daily: req.body.max_daily,
		max_weekly: req.body.max_weekly,
		max_monthly: req.body.max_monthly
	}

	createRule(params, function(result) {
		if (result.success) 
			res.json(result)
		else {
			console.log(result.error);
			res.json(result.error)
		}
	})

};

exports.show = function(req, res){
 	res.send('show rule ' + req.params.rule);
};

exports.update = function(req, res){

	var lab_id = req.params.lab;	
	var group_id = req.query.group;
	var timeblock = req.query.timeblock;
	timeblock = timeblock.replace("?", "").replace("/","");
	var rule_id = req.params.rule;

 	var params = {
		lab_id: lab_id,
		group_id: group_id,
		timeblock: timeblock,
		min_duration: req.body.min_duration,
		max_duration: req.body.max_duration,
		max_daily: req.body.max_daily,
		max_weekly: req.body.max_weekly,
		max_monthly: req.body.max_monthly
	}
	
	updateRule(params, function(result) {
		if (result.success) 
			res.json(result)
		else {
			console.log(result.error);
			res.json(result.error)
		}
	})

};

exports.destroy = function(req, res){
  res.send('show rule ' + req.params.rule);
};


function getRules(params, callback) {
	var db = mongo_lite.connect('mongodb://localhost/ilab_uss');
	db.log = null;
	db.rules = db.collection('rules');
	
	db.rules.first({ lab_id: params.lab_id, group_id: params.group_id, timeblock: params.timeblock }, function(err, rule) {
		console.log(params);
		if(!err) 
			callback(rule);
		else
			callback(err);
	})
}

function updateRule(params, callback) {

	db.rules.remove({ lab_id: params.lab_id, group_id: params.group_id, timeblock: params.timeblock }, function(err) {
		db.rules.save(params, function(err, doc){
			if (err) {
				callback({ success: false, error: err });
			} else {
				callback({ success: true, rule: doc, message: "Rule updated" });
			}
		})
	})
}

function createRule(params, callback) {
	db.rules.findOne({ lab_id: params.lab_id, group_id: params.group_id, timeblock: params.timeblock }, function(err, rule) {
		if (rule) {
			callback({ success: false, error: "Rule already exists"});
		} else {
			var rule = params;
			db.rules.save(rule, function(err, doc){
				if (err) {
					callback({ success: false, error: err });
				} else {
					callback({ success: true, rule: doc, message: "Rule created" });
				}
			})
		}
	})
}
