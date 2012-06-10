var mongo_lite = require('mongo-lite');

var db = mongo_lite.connect('mongodb://localhost/ilab_uss');
db.log = null;
db.labs = db.collection('labs');

var labs = [];

db.labs.all({ uss_id: "USS1" }, function(err, docs) {
	if (!err) {
  	for (var i in docs) {
  		labs[docs[i].lss_lab_id] = docs[i];
  	}
  	console.log("Lab configuration loaded successfully")
  } else {
  	console.log("Lab configuration failed to load")
  }

  global.labs = labs;
  
});
