var ReconnectingWebSocket = require("ReconnectingWebSocket");

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.ScreenInvader = factory();
  }
}(this, function () {
  var API = function(uri) {
    this.socket = new ReconnectingWebSocket(uri);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onerror = this.onError.bind(this);
    this.socket.onopen = this.onOpen.bind(this);

    this.eventHandlers = {};
  };
  function waitForSocketConnection(socket, callback){
    setTimeout(
        function () {
            if (socket.readyState === 1) {
                console.log("Connection is made")
                if(callback != null){
                    callback();
                }
                return;

            } else {
                console.log("wait for connection...")
                waitForSocketConnection(socket, callback);
            }

        }, 5); // wait 5 milisecond for the connection...
  }

  API.prototype = {
    onReceive: function(fn) {
      this.onReceiveCallback = fn;
    },
    onMessage: function(ev) {
      var update = JSON.parse(ev.data);
      if (!Array.isArray(update)) {
        // initial full sync.
        this.state = update;
        this.state.events = {};
      } else {
        if (!this.state) { return; }

        if (update[0].startsWith('/')) {
          // update has the format key, operation, value here.
          var path = update[0].split('/');
          path.shift();
          console.log(path);
          if(update[1] == "W") {
            console.debug('changing ' + update[0] + ' from ' +
                          this.getByPath(this.state, path.slice(0)) +
                          ' to ' + update[2]);
            this.setByPath(this.state, path.slice(0), update[2]);
          } else if(update[1] == "D") {
            this.deleteByPath(this.state, path.slice(0));
          }
        } else {
          // update has the following format: event, operation, value
          var eventName = update[0],
              params = update[2];
          var handlers = this.eventHandlers[eventName];
          if (Array.isArray(handlers)) {
            handlers.forEach(function(handler) {
              handler(params);
            });
          }
          return;
        }
      }
      if (typeof(this.onReceiveCallback) !== 'undefined') {
        this.onReceiveCallback(this.state);
      }
    },
    setByPath: function (obj, path, value) {
      if (path.length > 1) {
        key = path.shift();
        if(key.charAt(0) == '#') {
          //encountered an array element
          key = parseInt(key.substring(1));
        } else if(key == ".") {
          //encountered a directory element -> ignore
          return null;
        }

        if(obj[key] === undefined) {
          if(path.length >= 1 && path[0] == ".") {
            if(value.charAt(0) == 'A') {
              //create an array
              obj[key] = [];
              return null;
            } else {
              //create an object
              obj[key] = {};
              return null;
            }
          } else {
            obj[key] = "";
          }
        }
        return this.setByPath(obj[key], path, value);
      } else {
        key = path.shift();
        if(key == ".") {
          return null;
        }
        obj[key] = value;
      }
    },
    setByPath: function (obj, path, value) {
      if (path.length > 1) {
        key = path.shift();
        if(key.charAt(0) == '#') {
          //encountered an array element
          key = parseInt(key.substring(1));
        } else if(key == ".") {
          //encountered a directory element -> ignore
          return null;
        }

        if(obj[key] === undefined) {
          if(path.length >= 1 && path[0] == ".") {
            if(value.charAt(0) == 'A') {
              //create an array
              obj[key] = [];
              return null;
            } else {
              //create an object
              obj[key] = {};
              return null;
            }
          } else {
            obj[key] = "";
          }
        }
        return this.setByPath(obj[key], path, value);
      } else {
        key = path.shift();
        if(key == ".") {
          return null;
        }
        obj[key] = value;
      }
    },
    deleteByPath: function (obj, path) {
      if (path.length > 1) {
        key = path.shift();
        if(key.charAt(0) == '#') {
          key = parseInt(key.substring(1));
        }

        if(path[0] == ".") {
          if(Array.isArray(obj)) {
            if(obj.length < 2)
              obj = [];
            else
              obj.splice(key, 1);
          }
          else
            delete obj[key];

          return null;
        }

        return this.deleteByPath(obj[key], path);
      } else {
        key = path.shift();
        delete obj[key];
      }
    }, 
		getByPath: function(obj, path) {
      if (path.length > 0) {
        key = path.shift();
        if(key == ".") {
          return null;
        } else if (obj === undefined) {
          return null;
        }
        return this.getByPath(obj[key], path);
      }
    },
    subscribe: function(eventName, fn) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
      this.eventHandlers[eventName].push(fn);
    },
    onError: function(fn) {
      this.socket.onerror = fn;
    },
    onOpen: function(ev) {
      this.socket.send('setup');
      if(this.onready)
	this.onready();
    },
    onReady: function(fn) {
      this.onready = fn;
    },
    send: function(command, key, value) {
     var sock = this.socket;
      waitForSocketConnection(this.socket, function(){
        sock.send(
          JSON.stringify(
            Array.prototype.slice.call(
              arguments)));
      });
    },
    command: function(key, value) {
      console.debug('executing '+key+'('+value+')');
      this.send('publish', key, 'W', value);
    },
};

  return API;
}));
