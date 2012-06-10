$(document).ready(function() {

	var lab_id = $("#lab_id").val();
	var group_id = $("#group_id").val();
	var uss_url = "http://127.0.0.1:2000/ilab";

	$.each($("li.block"), function(index, block) {

		var block_id = $(block).find(".timeblock_id").val();
		
		var view_policy = $(block).find(".view_policy");
		var divRules = $(block).find("div.rule")[0];
		var save = $(divRules).find("input.saveRule");

		$(view_policy).click(function(e) {
			e.preventDefault();
			$(divRules).toggle();
		})

		loadRules(block_id, function(rules) {
			rules = JSON.parse(rules);
			$(divRules).find(".rule-id").val(rules._id);
			$(divRules).find(".min-duration").val(rules.min_duration);
			$(divRules).find(".max-duration").val(rules.max_duration);
			$(divRules).find(".max-daily").val(rules.max_daily);
			$(divRules).find(".max-weekly").val(rules.max_weekly);
			$(divRules).find(".max-monthly").val(rules.max_monthly);
		})

		save.click(function () {
			var _id = $(divRules).find(".rule-id").val();
			var min_duration = $(divRules).find(".min-duration").val();
			var max_duration = $(divRules).find(".max-duration").val();
			var max_daily = $(divRules).find(".max-daily").val();
			var max_weekly = $(divRules).find(".max-weekly").val();
			var max_monthly = $(divRules).find(".max-monthly").val();

			var rule = {
				_id: _id,
				min_duration: min_duration, 
				max_duration: max_duration,
				max_daily: max_daily,
				max_weekly: max_weekly,
				max_monthly: max_monthly
			}

			console.log(rule);

			saveRules(block_id, rule, function(result) {
				console.log(result);
				$(divRules).find(".rule-id").val(result.rule._id);
				showTip(result.message, 5000);
			})
		})


	});

	function saveRules(timeblock, rule, callback) {
		var method = "PUT";
		if (rule._id === "")
			method = "POST"

		console.log(rule);

		var data = {
			min_duration: rule.min_duration, 
			max_duration: rule.max_duration,
			max_daily: rule.max_daily,
			max_weekly: rule.max_weekly,
			max_monthly: rule.max_monthly
		}

		$.ajax({
      url: "/ajax",
      type: "POST",
      dataType: "json",
      data: {
      	content_type: "application/json",
      	data: data,
        url: uss_url + "/labs/" + lab_id + "/rules/" + rule._id + "?group=" + group_id + "&timeblock=" + timeblock, 
        method: method
      },
      success: function(doc) {
        callback(doc);
        
      }
    });

	}

	function loadRules(timeblock, callback) {
		
		$.ajax({
      url: "/ajax",
      type: "POST",
      dataType: "json",
      data: {
        url: uss_url + "/labs/" + lab_id + "/rules?group=" + group_id + "&timeblock=" + timeblock, 
        method: "GET"
      },
      success: function(doc) {
        callback(doc);
      }
    });
	}

	$("#labs").poshytip({
    className: 'tip-twitter',
    fade: true,
    slide: true,
    content: "",
    showTimeout: 0,
    hideTimeout: 0,
    alignY: 'center',
    alignX: 'center',  
    alignTo: 'target',
    showOn: 'none',
  });

	function showTip(content, time) {
    $("#labs").poshytip('update', content);
    $("#labs").poshytip('show'); 
    setTimeout(hideTip, time); 
  }

  function hideTip() {
    $("#labs").poshytip('update', "");
    $("#labs").poshytip('hide');
  }
})