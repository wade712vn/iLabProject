$(document).ready(function() {

  var uss = [
    { 
      uss_id: "USS1", 
      title: "USS 1", 
      institution: "University of Queensland",
      groups: [
        { 
          group_id: "G001",
          name: "Group 1",
        },
        { 
          group_id: "G002",
          name: "Group 2",
        },
        { 
          group_id: "G003",
          name: "Group 3",
        }
      ]
    },
    { 
      uss_id: "USS2", 
      title: "USS 2", 
      institution: "Queensland University of Technology",
      groups: [
        { 
          group_id: "G004",
          name: "Group 4",
        },
        { 
          group_id: "G005",
          name: "Group 5",
        },
        { 
          group_id: "G006",
          name: "Group 6",
        }
      ]
    }
  ]

  for (var i in uss) {
    $("#uss").append("<option value='" + uss[i].uss_id + "'>" + uss[i].title + "</option>");
    var a = $("<select class='" + uss[i].uss_id + "' name='group' ></select>");
    a.appendTo($("#group"));
    for (var j in uss[i].groups) {
      a.append("<option value='" + uss[i].groups[j].group_id + "'>" + uss[i].groups[j].name + "</option>");
    }
  }

  $("#uss").change(function() {
    var uss = $("#uss").val();
    $("#group").find("select").hide();
    $("#group").find("select." + uss ).show();
  });

  $("#uss").trigger("change");

  var date = new Date();
  var d = date.getDate();
  var m = date.getMonth();
  var y = date.getFullYear();

  var lab_id = $("#lab_id").val();
  var lss_url = "http://localhost:3000/ilab/labs/" + lab_id + "/timeblocks";

  var $dialog = $("#event_edit_container");
  var startField =  $dialog.find("select[name='start']");
  var endField =  $dialog.find("select[name='end']");

  var $calendar = $("#calendar").fullCalendar({
    header: {
      left: 'prev,next today refresh',
      center: 'title',
      right: 'month,agendaWeek,agendaDay'
    },
    allDaySlot: false,
    unselectAuto: false,
    disableDragging: true,
    disableResizing: true,
    firstDay: 1,
    slotMinutes: 30,
    lazyFetching: true,
    height: $(document).height() - 100,
    defaultView: 'agendaWeek',
    selectable: true,
    selectHelper: true,
    eventClick: function(event, jsEvent, view) {
      resetForm($dialog);
      $dialog.find("form")[0].reset();
      $dialog.find("textarea[name='comment']").text("");

      startField.val(event.start);
      endField.val(event.end);
      
      $dialog.find("span[name='lab']").text(lab_id);
      $dialog.find("select[name='group']").val(event.title);
      $dialog.find("select[name='uss']").val(event.uss);
      $dialog.find("textarea[name='comment']").text(event.comment);
      $dialog.find("input[name='title']").val(event._title);

      if (event.recurrence) {
        
        $dialog.find("select[name='recurrence']").val(event.rrule.FREQ);
        $dialog.find("select[name='recurrence']").trigger("change");

        $("#recurrence_end").val(formatDateString(event.rrule.UNTIL));
        
      }
      $("#uss").trigger("change");
      
      $dialog.dialog({
        modal: true,
        width: 380,
        title: "Edit time block",
        close: function() {
          closeDialog($dialog);
          $calendar.fullCalendar('unselect');
        },
        buttons: {
          "Save" : function() {
            showOverlay();
            var start = startField.val();
            var end = endField.val();
            var title = "Timeblock";
            var group = $dialog.find("select[name='group']").val();
            var lab = $dialog.find("span[name='lab']").text();
            var comment = $dialog.find("textarea[name='comment']").val();
            var location = $dialog.find("input[name='location']").val();
            var uss = $dialog.find("select[name='uss']").val();
            var recurrence = $dialog.find("select[name='recurrence']").val();
            var recurrence_end = $dialog.find("input[name='recurrence_end']").val();

            recurrence_end = dateToString(recurrence_end, $("select[name='end'] option:selected").text() + ":00" );
            
            $.ajax({
              url: "/ajax",
              type: "POST",
              dataType: "json",
              data: {
                content_type: "application/json",
                data: {
                  timeblock: event.timeblock_id,
                  title: title,
                  group: group,
                  lab: lab,
                  comment: comment,
                  location: location,
                  uss: uss,
                  start: start,
                  end: end,
                  recurrence_type: recurrence,
                  recurrence_end: recurrence_end
                },
                method: "PUT",
                url: lss_url + "/" + event.timeblock_id
              },
              success: function(doc) {
                console.log(doc);
                if (doc.success) {
                  $calendar.fullCalendar('refetchEvents');
                  showTip("Time block updated", 5000)
                  console.log("Time block %d updated", event.timeblock_id);
                  console.log(doc.timeblock);
                } else {
                  clearOverlay();
                  showTip("Cannot update time block", 3000)
                }
              }
            });

            closeDialog($dialog);
            $calendar.fullCalendar('unselect');
            
          },
          "Delete" : function() {
            showOverlay();
            $.ajax({
              url: "/ajax",
              type: "POST",
              dataType: "json",
              data: {
                content_type: "application/json",
                data: {
                  etag: event.etag,
                },
                method: "DELETE",
                url: lss_url + "/" + event.timeblock_id
              },
              success: function(doc) {
                if (doc.success) {
                  $calendar.fullCalendar('refetchEvents');
                  showTip("Time block deleted", 5000)
                  console.log("Time block %d deleted.", event.timeblock_id); 
                } else {
                  clearOverlay();
                  showTip("Cannot delete time block", 3000)
                }
              }
            });

            closeDialog($dialog);
            $calendar.fullCalendar('unselect');
          },
          "Cancel" : function() {
            closeDialog($dialog);
            $calendar.fullCalendar('unselect');
          },
          
        }
      }).show();    
      var calEvent = {
        start: event.start,
        end: event.end,
      }
      $dialog.find(".date_holder").text(event.start.getDate() + "/" + (event.start.getMonth() + 1) + "/" + event.start.getFullYear());
      setupStartAndEndTimeFields(startField, endField, calEvent, getTimeslotTimes(event.start));
      
    },
    select: function(start, end, allDay) {

      $dialog.find("form")[0].reset();
      $dialog.find("textarea[name='comment']").text("");

      var startField = $dialog.find("select[name='start']").val(start);
      var endField = $dialog.find("select[name='end']").val(end);

      var labIdField = $dialog.find("span[name='lab']").text(lab_id);

      resetForm($dialog);
      $dialog.dialog({
        modal: true,
        width: 380,
        title: "Assign time block",
        close: function() {
          closeDialog($dialog);
          $calendar.fullCalendar('unselect');
        },
        buttons: {
          save : function() {
            showOverlay();
            var start = startField.val();
            var end = endField.val();
            var title = "Timeblock"
            var group = $dialog.find("select[name='group']").val();
            var lab = $dialog.find("span[name='lab']").text();
            var comment = $dialog.find("textarea[name='comment']").val();
            var location = $dialog.find("input[name='location']").val();
            var uss = $dialog.find("select[name='uss']").val();
            var recurrence = $dialog.find("select[name='recurrence']").val();
            
            var recurrence_end = $dialog.find("input[name='recurrence_end']").val();
            
            recurrence_end = dateToString(recurrence_end, $("select[name='end'] option:selected").text() + ":00" );

            $.ajax({
              url: "/ajax",
              type: "POST",
              dataType: "json",
              data: {
                content_type: "application/json",
                data: {
                  title: title,
                  group: group,
                  lab: lab,
                  comment: comment,
                  location: location,
                  uss: uss,
                  start: start,
                  end: end,
                  recurrence_type: recurrence,
                  recurrence_end: recurrence_end
                },
                url: lss_url, 
                method: "POST"
              },
              success: function(doc) {
                if (doc.success) {
                  $calendar.fullCalendar('refetchEvents');
                  showTip("Time block created", 5000)
                  console.log("Time block created");
                  console.log(doc.timeblock);
                } else {
                  clearOverlay();
                  showTip("Cannot create time block", 3000)
                }
              }
            });

            closeDialog($dialog);
            $calendar.fullCalendar('unselect');
           
          },
          cancel : function() {
            closeDialog($dialog);

            $calendar.fullCalendar('unselect');
          }
        }
      }).show();    
      var calEvent = {
        start: start,
        end: end,
      }
      $dialog.find(".date_holder").text(start.getDate() + "/" + (start.getMonth() + 1) + "/" + start.getFullYear());
      setupStartAndEndTimeFields(startField, endField, calEvent, getTimeslotTimes(start));   
      
    },
    events: function(start, end, callback) {
      showOverlay();
      $.ajax({
        url: "/ajax",
        type: "POST",
        dataType: "json",
        data: {
          content_type: "application/x-www-form-urlencoded",
          query: {
            start: convertToUTC(start),
            end: convertToUTC(end),
            group: ""
          },
          url: lss_url, 
          method: "GET"
        },
        success: function(doc) {
          var json = $.parseJSON(doc);
          var events = [];
          $.each(json.timeblocks, function(index, obj) {
            var details = $.parseJSON(obj.details);
            if (details) {
              var rrules = {};
              if (obj.recurrence) {
                var rules = obj.recurrence.split("\r\n");
                $.each((rules[2].replace("RRULE:", "")).split(";"), function(i, r) {
                  rrules[r.split("=")[0]] = r.split("=")[1];
                });
                
              }

              $.each(obj.when, function(index, when) {
                events.push({
                  timeblock_id: obj.timeblock_id,
                  title: details.group_id,
                  _title: obj.title,
                  comment: details.comment,
                  start: when.start,
                  end: when.end,
                  allDay: false,
                  uss: details.uss_id,
                  etag: obj.etag,
                  recurrence: obj.recurrence,
                  rrule: rrules
                })
              });

            }

          })
          clearOverlay();
          callback(events);

        }
      });
    }, 
    eventRender: function(event, element) {
      element.addClass("timeblock");
      element.addClass(event.title);
      if (event.comment) 
        element.poshytip({
          className: 'tip-darkgray',
          followCursor: true,
          slide: false,
          bgImageFrameSize: 12,
          content: event.comment,
          showTimeout: 0,
          hideTimeout: 0
        });
    },
    eventAfterRender: function(event, element, view) {
      element.height(element.height() - 3);
    }

  });

  $("#recurrence").change(function() {

    var recurrence = $("#recurrence").val();
    if (recurrence !== "") {    
      $("#end_recurrence").show();
    } else {
      $("#end_recurrence").hide();
    }
  })
  $("#recurrence_end").datepicker({
    dateFormat: 'dd/mm/yy',
    minDate: new Date()
  });

  $("#recurrence").trigger("change");

  function setupStartAndEndTimeFields($startTimeField, $endTimeField, calEvent, timeslotTimes) {
    $startTimeField.html("");
    $endTimeField.html("");
    for (var i = 0; i < timeslotTimes.length; i++) {
      var startTime = timeslotTimes[i].start;
      var endTime = timeslotTimes[i].end;
      var startSelected = "";
      if (startTime.getTime() === calEvent.start.getTime()) {
        startSelected = "selected=\"selected\"";
      }
      var endSelected = "";
      if (endTime.getTime() === calEvent.end.getTime()) {
        endSelected = "selected=\"selected\"";
      }
      $startTimeField.append("<option value=\"" + startTime + "\" " + startSelected + ">" + timeslotTimes[i].startFormatted + "</option>");
      $endTimeField.append("<option value=\"" + endTime + "\" " + endSelected + ">" + timeslotTimes[i].endFormatted + "</option>");

    }
    $endTimeOptions = $endTimeField.find("option");
    
    $startTimeField.trigger("change");
  }

  var $endTimeField = $("select[name='end']");
  var $endTimeOptions = $endTimeField.find("option");

  //reduces the end time options to be only after the start time options.
  $("select[name='start']").change(function() {

    var startTime = $(this).find(":selected").val();
    var currentEndTime = $endTimeField.find("option:selected").val();
    
    $endTimeField.html(
      $endTimeOptions.filter(function() {
        return new Date(startTime) < new Date($(this).val());
      })
    );

    var endTimeSelected = false;
    $endTimeField.find("option").each(function() {
      if ($(this).val() === currentEndTime) {
        $(this).attr("selected", "selected");
        endTimeSelected = true;
        return false;
      }
    });

    if (!endTimeSelected) {
      $endTimeField.find("option:eq(0)").attr("selected", "selected");
    }

  });

  $(calendar).poshytip({
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

  function showOverlay() {
    $('#overlay').fadeIn('fast', function(){
        $('#box').fadeIn('fast');
    });
  };
  
  function clearOverlay() {
    $('#box').fadeOut('fast', function(){
        $('#overlay').fadeOut('fast');
    });
  };

  function getTimeslotTimes(date) {
    var options = this.options;
    var businessHours = {start: 8, end: 18, limitDisplay: true }
    var firstHourDisplayed = 0;
    var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), firstHourDisplayed);

    var times = []
    var startMillis = startDate.getTime();
    for (var i = 0; i < 24 * 60 / 30; i++) {
      var endMillis = startMillis + 30 * 60 * 1000;
      times[i] = {
        start: new Date(startMillis),
        startFormatted: formatTime(new Date(startMillis)),
        end: new Date(endMillis),
        endFormatted: formatTime(new Date(endMillis))
      };
      
      startMillis = endMillis;
    }
    return times;
  }

  function formatTime(date) {

    var hours = ((date.getHours()) < 10 ? '0' : '') + (date.getHours());
    var mins = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes()
    var meridiem = date.getHours() < 12 ? 'am' : 'pm';

    return hours + ":" + mins;
  }

  function convertToUTC (localTime, timeDiff) {

    return localTime.toISOString();

  }

  function dateToString (date, time) {
    var string = convertToUTC(new Date(date.substring(6, 10), date.substring(3, 5) - 1, date.substring(0, 2), time.substring(0, 2), time.substring(3, 5)));
    string = string.replace(/-/gi, "").replace(/:/gi,"").replace(".000","");
    return string;
  } 

  function formatDateString (str) {
    var date = str.substring(6, 8) + "/" + str.substring(4, 6) + "/" + str.substring(0, 4);
    return date;
  }

  function closeDialog($dialog) {
    $dialog.dialog("destroy");
    $dialog.hide();
    $("#radioNever").attr("checked", "checked");
    $("#radioEnd").removeAttr("checked");
    $("#radioEnd_recurrence").hide();
    $("#uss").trigger("change");
  }

  function resetForm($dialog) {
    $("#recurrence").val("");
    $("#recurrence").trigger("change");
    $("#uss").trigger("change"); 
  }

  function showTip(content, time) {
    $calendar.poshytip('update', content);
    $calendar.poshytip('show'); 
    setTimeout(hideTip, time); 
  }

  function hideTip() {
    $calendar.poshytip('hide');
  }

  $.each($(".color"), function(index, picker) {
    $(picker).miniColors({
      change: function(hex, rgb) {
        $("." + $(picker).attr("group")).css({ "background-color": hex, "border-color": hex });
        $("." + $(picker).attr("group")).find(".fc-event-skin"). css({ "background-color": hex, "border-color": hex });
      }
    });
  });

  $("#btnColors").click(function() {
    $("#groups").toggle();
  })

  $("#closeColors").click(function() {
    
    $("#groups").hide();
  })
});

