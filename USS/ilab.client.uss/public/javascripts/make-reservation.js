$(document).ready(function() {
  var date = new Date();
  var d = date.getDate();
  var m = date.getMonth();
  var y = date.getFullYear();

  var timeblocks = [];
  var reservations = [];

  var lab_id = $("#lab_id").val();
  var lab_url = "http://" + $("#lab_url").val();
  
  var username = $("#username").val();
  var group = $("#group_id").val();

  var $dialog = $("#event_edit_container");
  var startField =  $dialog.find("select[name='start']");
  var endField =  $dialog.find("select[name='end']");

  var groupField = $dialog.find("span[name='group']");
  var userField = $dialog.find("span[name='user']");
  var labField = $dialog.find("span[name='lab']");
  var commentField = $dialog.find("textarea[name='comment']");
  var ussField = $dialog.find("span[name='uss']");

  var $calendar = $("#calendar").fullCalendar({
    header: {
      left: 'prev,next today refresh',
      center: 'title',
      right: 'agendaWeek,agendaDay'
    },
    firstDay: 1,
    allDaySlot: false,
    unselectAuto: false,
    disableDragging: true,
    disableResizing: true,
    slotMinutes: 30,
    lazyFetching: true,
    height: $(document).height() - 100,
    defaultView: 'agendaWeek',
    selectable: true,
    selectHelper: true,
    eventClick: function(event, jsEvent, view) {
      
      if (event.user !== username)
        return false;
      $dialog.find("form")[0].reset();
      $dialog.find("textarea[name='comment']").text("");

      startField.val(event.start);
      endField.val(event.end);
      
      labField.text(lab_id);
      groupField.text(event.title);
      ussField.text(event.uss);
      commentField.text(event.comment);

      var url = lab_url + "/reservations/" + event.reservation_id;

      $dialog.dialog({
        modal: true,
        width: 380,
        title: "Edit reservation",
        close: function() {
          closeDialog($dialog);
          $calendar.fullCalendar('unselect');
        },
        buttons: {
          "Cancel" : function() {
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
                url: url
              },
              success: function(doc) {
                if (doc.success) {
                  $calendar.fullCalendar('refetchEvents');
                  showTip("Reservation deleted", 5000)
                } else {
                  showTip("Cannot delete reservation", 3000)
                }
              }
            });

            closeDialog($dialog);
            $calendar.fullCalendar('unselect');
          },
          "Save" : function() {
            var start = startField.val();
            var end = endField.val();

            formSave(event.reservation_id, "PUT", url)
          }
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
      if (start < new Date()) {
        $calendar.fullCalendar('unselect');
        return false;
      }

      var timeblock_id = "";

      var isAllowed = false;
      for (var i in timeblocks) {
        if ( start >= timeblocks[i].start && end <= timeblocks[i].end) {
          isAllowed = true;
          timeblock_id = timeblocks[i].timeblock_id;
        }
      }
      
      for (var i in reservations) {
        if (!(start >= reservations[i].end || end <= reservations[i].start))
          isAllowed = false;
      }

      if (!isAllowed) {
        $calendar.fullCalendar('unselect');
        return false;
      }

      $dialog.find("form")[0].reset();
      $dialog.find("textarea[name='comment']").text("");

      var startField = $dialog.find("select[name='start']").val(start);
      var endField = $dialog.find("select[name='end']").val(end);

      var labIdField = $dialog.find("span[name='lab']").text(lab_id);

      $dialog.dialog({
        modal: true,
        width: 380,
        title: "Make Reservation",
        close: function() {
          closeDialog($dialog);
          $calendar.fullCalendar('unselect');
        },
        buttons: {
          "Cancel" : function() {
            closeDialog($dialog);

            $calendar.fullCalendar('unselect');
          },
          "Save" : function() {
            formSave("", "POST", lab_url + "/reservations")
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
          content_type: "application/json",
          query: {
            start: convertToUTC(start),
            end: convertToUTC(end),
            group: group,
          },
          url: lab_url + "/timeblocks", 
          method: "GET"
        },
        success: function(doc) {
          
          var events = [];
          timeblocks = [];
          console.log("Loading time blocks");
          $.each(JSON.parse(doc).timeblocks, function(index, obj) {
            console.log(obj);
            var details = $.parseJSON(obj.details);
            if (details) {

              
              $.each(obj.when, function(index, when) {
                timeblocks.push({
                  timeblock_id: obj.timeblock_id,
                  start: new Date(when.start),
                  end: new Date(when.end),
                })
                events.push({
                  title: details.group_id,
                  timeblock_id: obj.timeblock_id,
                  start: when.start,
                  end: when.end,
                  allDay: false,
                })
              });

            }

          })

          loadReservations(start, end, function(reservations) {
            $.each(reservations, function(index, reservation) {
              events.push(reservation);
            })
            clearOverlay(); 
            callback(events);
          });

        }
      });
    }, 
    eventRender: function(event, element) {
      
    },
    eventAfterRender: function(event, element, view) {
      if (event.timeblock_id) {
        element.height(element.height() + 1);
        element.width(element.width() + 11);
        element.html("<div style='padding: 2px; color: #0B610B'></div>");
        element.addClass("timeblock");
        if (new Date(event.end) < new Date())
          element.addClass("over");
        element.css("left", parseInt(element.css("left").replace("px", "")) - 3 + "px");
        element.css("top", parseInt(element.css("top").replace("px", "")) - 1 + "px");
      } else {

        element.addClass("reservation");
        element.find("div").css("z-index", 12);
        element.height(element.height() - 8);
        element.width(element.width() + 3);
        element.css("left", parseInt(element.css("left").replace("px", "")) + 2 + "px");
        element.css("top", parseInt(element.css("top").replace("px", "")) + 4 + "px");
        
        if (event.user === username) {


        } else {
          element.addClass("not-mine");
          element.html("");
        }
      }
    }
  });

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

  function convertToUTC (localTime) {
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
  }

  function loadReservations(start, end, callback) {
    $.ajax({
      url: "/ajax",
      type: "POST",
      dataType: "json",
      data: {
        content_type: "application/x-www-form-urlencoded",
        query: {
          start: convertToUTC(start),
          end: convertToUTC(end),
          group: group,
          user: "",
        },
        url: lab_url + "/reservations", 
        method: "GET"
      },
      success: function(doc) {

        var json = $.parseJSON(doc);
        console.log("Loading reservations");
        var events = [];
        reservations = [];
        $.each(json, function(index, obj) {
          var details = $.parseJSON(obj.details);
          if (details) { 
            var when = obj.when[0];
            reservations.push({
              reservation_id: obj.reservation_id,
              start: new Date(when.start),
              end: new Date(when.end),
            })
            events.push({
              reservation_id: obj.reservation_id,
              uss_reservation_id: details.reservation_id,
              title: details.group_id,
              user: details.user_id,
              _title: obj.title,
              comment: details.comment,
              start: when.start,
              end: when.end,
              allDay: false,
              uss: details.uss_id,
              etag: obj.etag,
            })
            console.log(events[events.length - 1]);
          }
        })
        clearOverlay();
        callback(events);
      }
    });
  }

  function showTip(content, time) {
    $calendar.poshytip('update', content);
    $calendar.poshytip('show'); 
    setTimeout(hideTip, time); 
  }

  function hideTip() {
    $calendar.poshytip('hide');
    $calendar.poshytip('update', "");
  }

  function getFormData() {
    var start = startField.val();
    var end = endField.val();
    var title = "Reservation";
    var group = groupField.text();
    var user = userField.text();
    var lab = labField.text();
    var comment = commentField.val();
    var uss = ussField.text();

    var data = {
      title: title,
      group: group,
      lab: lab,
      user: user,
      comment: comment,
      uss: uss,
      start: start,
      end: end,
    };
    return data;
  }

  function formSave(reservation_id, method, url) {
    showOverlay();
    var data = getFormData();
    var start = new Date(data.start);
    var end = new Date(data.end);

    var isAllowed = false;
    var timeblock_id;
    
    console.log(timeblocks);

    for (var i in timeblocks) {
      if ( start >= timeblocks[i].start && end <= timeblocks[i].end) {
        
        isAllowed = true;
        timeblock_id = timeblocks[i].timeblock_id;
      }
    }

    for (var i in reservations) {
      if (!(start >= reservations[i].end || end <= reservations[i].start)) 
        if (reservations[i].reservation_id !== reservation_id)
          isAllowed = false;
    }

    if (!isAllowed) {
      $calendar.fullCalendar('unselect');
      closeDialog($dialog);
      clearOverlay();
      showTip("Invalid operation", 5000);
      return false;
    }

    if (timeblock_id !== "")
      data.timeblock_id = timeblock_id;

    $.ajax({
      url: "/ajax",
      type: "POST",
      dataType: "json",
      data: {
        content_type: "application/json",
        data: data,
        method: method,
        url: url
      },
      success: function(doc) {

        if (doc.success) {
          $calendar.fullCalendar('refetchEvents');
          showTip(doc.message, 5000);
        } else {
          clearOverlay();
          showTip(doc.message, 4000)
        }
      }
    });

    closeDialog($dialog);
    $calendar.fullCalendar('unselect');
  }
});

