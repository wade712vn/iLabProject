$(document).ready(function() {
  var date = new Date();
  var d = date.getDate();
  var m = date.getMonth();
  var y = date.getFullYear();

  var lab_id = $("#lab_id").val();
  var lss_url = "http://localhost:3000/ilab";

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
    selectable: false,
    selectHelper: true,
    eventClick: function(event, jsEvent, view) {
      
      return false;

      $dialog.find("form")[0].reset();
      $dialog.find("textarea[name='comment']").text("");

      startField.val(event.start);
      endField.val(event.end);
      
      $dialog.find("span[name='lab']").text(lab_id);
      $dialog.find("select[name='group']").val(event.title);
      $dialog.find("select[name='uss']").val(event.uss);
      $dialog.find("textarea[name='comment']").text(event.comment);
      $dialog.find("input[name='title']").val(event._title);

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
        }
      }).show();    
      var calEvent = {
        start: event.start,
        end: event.end,
      }
      $dialog.find(".date_holder").text(event.start.getDate() + "/" + (event.start.getMonth() + 1) + "/" + event.start.getFullYear());
      setupStartAndEndTimeFields(startField, endField, calEvent, getTimeslotTimes(event.start));
      
    },
    events: function(start, end, callback) {
      showOverlay();
      
      $.ajax({
        url: "/ajax",
        type: "POST",
        dataType: "json",
        data: {
          query: {
            start: convertToUTC(start),
            end: convertToUTC(end),
            group: "",
          },
          url: lss_url + "/labs/" + lab_id + "/timeblocks", 
          method: "GET"
        },
        success: function(doc) {
          var json = $.parseJSON(doc);
          var events = [];
          $.each(json.timeblocks, function(index, obj) {
            var details = $.parseJSON(obj.details);
            if (details) {

              $.each(obj.when, function(index, when) {
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
        element.height(element.height() + 2);
        element.width(element.width() + 14);
        element.html("<div style='padding: 2px; color: #0B610B'></div>");
        element.addClass("timeblock");
        element.css("left", parseInt(element.css("left").replace("px", "")) - 3 + "px");
        element.css("top", parseInt(element.css("top").replace("px", "")) - 1 + "px");
      } else {
        element.addClass("reservation");
        element.find("div").css("z-index", 12);
        element.height(element.height() - 8);
        element.width(element.width() + 4);
        element.css("left", parseInt(element.css("left").replace("px", "")) + 2 + "px");
        element.css("top", parseInt(element.css("top").replace("px", "")) + 4 + "px");
        if (event.comment) {
          element.poshytip({
            className: 'tip-darkgray',
            followCursor: true,
            slide: false,
            bgImageFrameSize: 12,
            content: event.comment,
            showTimeout: 0,
            hideTimeout: 0          
          });
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
    content: "New reservation created",
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
  }

  function loadReservations(start, end, callback) {
    $.ajax({
      url: "/ajax",
      type: "POST",
      dataType: "json",
      data: {
        query: {
          start: convertToUTC(start),
          end: convertToUTC(end),
          group: "",
        },
        url: lss_url + "/labs/" + lab_id + "/reservations", 
        method: "GET"
      },
      success: function(doc) {
        var json = $.parseJSON(doc);
        var events = [];
        $.each(json, function(index, obj) {
          var details = $.parseJSON(obj.details);
          if (details) {

            $.each(obj.when, function(index, when) {
              
              events.push({
                reservation_id: obj.reservation_id,
                title: details.group_id,
                _title: obj.title,
                comment: details.comment,
                start: when.start,
                end: when.end,
                allDay: false,
                uss: details.uss_id,
                etag: obj.etag,
              })
            });

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
  }
});

