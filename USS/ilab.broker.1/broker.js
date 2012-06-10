var http = require('http'),
  request = require('request'),
  querystring = require('querystring');


var app = http.createServer(function (req, res) {
  console.log("Received request ...");

  var data = '';

  req.on('data', function(chunk) {
    data += chunk;
  });

  req.on('end', function() {
    
    var path = req.url;
    
    var method = req.method;

    var dest = "";
    var url = "";
    var paths = path.split("/");
    for (var i in paths) {
      if (i == 1)
        dest = paths[i];
      else 
        url += paths[i] + "/";
    }
    console.log(data);
    console.log("Forwarding request to %s", dest);
    forwardRequest(dest, url, data, method, function(result) {

      console.log("");
      res.writeHead(200, {
        'Content-Length': result.length,
        'Content-Type': 'text/json',
      });
      console.log(result);
      try {
        res.end(result);
      } catch (e) {
        res.end("Error");
      }

    })
    
  });

});

function forwardRequest(dest, url, data, method, callback) {
  
  if (dest === "uss")
    url = "http://127.0.0.1:2000" + url;
  else
    url = "http://127.0.0.1:3001" + url;

  var ussRequest = {
    headers: {
      'content-type' : 'application/json'
    },
    url: url,
    method: method,
    json: data,
  }

  request(ussRequest, function(err, res, body) {
    if (!err)
      callback(body);
    else
      callback(err);
  });
}

app.listen(2001, function() {
  console.log("USS Service Broker 1 listening on port %d", app.address().port);
})

