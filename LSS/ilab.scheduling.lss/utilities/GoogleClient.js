var EventEmitter = require('events').EventEmitter,
  https = require('https'),
  util = require('util'),
  url = require('url'),
  request = require('request'),
  mongo_lite = require('mongo-lite');

var config;
var tokenRefreshed = false; 

// useragent string
const userAgent = 'GCLNodejs';
// version string
const ver = '0.2.2';

const loginURL = '/accounts/ClientLogin';
const googleHost = 'www.google.com';

// error messages
const errors = {
  loginFailed: 'Login failed'
};

const events = {
  login: 'login',
  error: 'error',
  response: 'response'
};

var db = mongo_lite.connect('mongodb://localhost/ilab_lss');
db.log = null;
db.lss = db.collection('lss');

db.lss.first({ lss_id: "LSS1" }, function(err, lss) {
  if (lss) {
    config = lss;
    console.log("LSS configuration loaded successfully");
  } else {
    config = {

    }
    console.log("LSS info not found in database");
  }
});

var GoogleClient = function () {
  // stores the authentication data
  this.auths = {};
  this.loginProcessing = false;
};
GoogleClient.prototype = {};
util.inherits(GoogleClient, EventEmitter);

/**
 * Splits response data into key-value pairs,
 * Only for internal usage
 * @method _parseData
 */
GoogleClient.prototype._parseData = function (data) {
  this.auths = {};
  data.split('\n').forEach(function (dataStr) {
    var data = dataStr.split('=');
    this.auths[data[0]] = data[1];
  }.bind(this));
};

/**
 * Parses the response of the login
 * emits error and login event
 * @method _parseLoginResponse
 * @param {http.ClientResponse} response The response object
 */
GoogleClient.prototype._parseLoginResponse = function (response) {

  var data = '';

  response.on('data', function (chunk) {
    data += chunk;
  }.bind(this));

  response.on('error', function (e) {
    error = {
      error: e
    }
    this.emit(events.error, e);
  }.bind(this));

  response.on('end', function () {

    this.loginProcessing = false;
    var statusCode = response.statusCode, error;

    this._parseData(data);
    if (statusCode >= 200 && statusCode < 300) {
      /**
       * Fires when login was success
       * @event login
       */
      this.emit(events.login);
    } else {
      /**
       * Fires when login failed
       * @event loginFailed
       */
      error = {
        error: "Login failed",
        statusCode: statusCode
      }
      this.emit(events.error, error);
    }
  }.bind(this));
};

/**
 * Logs in the user
 * @method login
 * @param {Object} params (optional)
 */
GoogleClient.prototype.login = function () {
  console.log("Logging in ... ");
  if (!this.loginProcessing) {
    this.loginProcessing = true;

    var content, request;

    output = {
      accountType: 'HOSTED_OR_GOOGLE',
      Email: config.google.email,
      Passwd: config.google.password,
      service: "cl",
      source: userAgent + '_' + ver
    };

    content = require('querystring').stringify(output);

    if (content !== false) {
      request = require('https').request(
        {
          host: 'www.google.com',
          port: 443,
          path: loginURL,
          method: 'POST',
          headers: {
            'Content-Length': content.length,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        },
        this._parseLoginResponse.bind(this)
      );
      request.write(content);
      request.end();
    }
  }
  
};

/**
 * Method to get the AuthId property
 * @method getAuthId
 * @returns the AuthId or undefined
 */
GoogleClient.prototype.getAuthId = function () {
  return this.auths.Auth;
};

GoogleClient.prototype.setAuthId = function (token) {
  this.auths.Auth = token;
};

/**
 * Method to get the error code
 * @method getError
 * @returns the error code or undefined
 */
GoogleClient.prototype.getError = function () {
  return this.auths.Error;
};

GoogleClient.prototype.sendRequest = function(params) {
  console.log("Sending request ...");
  if (config.google.auth_token !== null) {
    _sendRequest(params, this, config.google.auth_token);
  } else {
    console.log("Token is null");
    this.on('login', function() {
      config.google.auth_token = this.getAuthId();
      db.lss.save(config, function(err, doc) {
        console.log("Login token updated");
      });
      _sendRequest(params, this, this.getAuthId());
    }.bind(this));
    this.login();
  }
};

var _sendRequest = function (params, self, authId) {

  var headers = {
    'Authorization': 'GoogleLogin auth=' + authId,
    'Content-Type': 'application/json',
    'GData-Version': 2,
    'Cookie': config.google.cookie ? config.google.cookie.value : ""
  }

  if (params.headers) {
    headers['If-Match'] = params.headers.etag;
  }

  var requestHeader = {
    host: 'www.google.com',
    port: 443,
    path: params.path,
    method: params.method,
    headers: headers
  };
  var request = https.request(requestHeader, function(response) {

    var buffer = "";

    var statusCode = response.statusCode;
    console.log(statusCode);
    if (statusCode == 302) {
      tokenRefreshed = false;
      console.log("Redirecting ... ");

      var cookieInfo = response.headers['set-cookie'];

      for (var i in cookieInfo) {
        if (cookieInfo[i].indexOf("S=calendar") !== -1) {
          var cookie = cookieInfo[i].split(";")
          var expire = (cookieInfo[i].split(";")[1]).replace("Expires=","");
        }
      }
      
      config.google.cookie = {
        value: cookie,
        expires: expire
      }

      db.lss.save(config, function(err, doc) {
        console.log("Session Cookie updated");
      });

      params.path = url.parse(response.headers.location).pathname + "?" + url.parse(response.headers.location).query;
      
      _sendRequest(params, self, authId);

    } else if (statusCode >= 200 && statusCode < 300) { 
      tokenRefreshed = false;
      response.on("data", function(data) { 
        buffer = buffer + data;
      });
      
      response.on("end", function() { 
        console.log("Returning response ...");        

        self.emit("response", { statusCode: statusCode, response: buffer, success: true });
        
      });

    } else {  
      response.on("data", function(data) { 
        buffer = buffer + data;
      });

      response.on("end", function() { 
        if (statusCode === 401) {
          console.log("Bad token");
          if (!tokenRefreshed) {
            config.google.auth_token = null;
            tokenRefreshed = true;
            self.sendRequest(params);
          } else {
            error = {
              error: "Cannot obtain valid token",
              statusCode: statusCode
            }
            self.emit("error", error);
          }
        } else {
          try {
            console.log(JSON.parse(buffer).error.message);  
          } catch (e) {
            console.log(e);
            
          }

          error = {
            statusCode: statusCode,
            response: buffer
          }
          self.emit("error", error);
        }
      });
    }
  });

  if (params.data) {
    request.write(JSON.stringify(params.data));
  }

  request.end();
}

GoogleClient.errors = errors;

exports.GoogleClient = GoogleClient;
