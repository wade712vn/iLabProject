exports.convertToUTC = function (localTime, timeDiff) {
	var strDate = localTime.split("T")[0];
	var strTime = localTime.split("T")[1];

	var year = strDate.split("-")[0];
	var month = strDate.split("-")[1];
	var date = strDate.split("-")[2];

	var hour = strTime.split(":")[0];
	var minute = strTime.split(":")[1];
	
	var local = new Date(year, month - 1, date, hour, minute)

	return local.toISOString();

}
