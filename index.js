var ReconnectingWebSocket = require("reconnecting-websocket");


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
                if(callback != null){
                    callback();
                }
                return;

            } else {
                waitForSocketConnection(socket, callback);
            }

        }, 100); // wait 100 milisecond for the connection...
  }

  API.prototype = {
    onReceive: function(fn) {
      this.onReceiveCallback = fn;
    },
    onMessage: function(ev) {
      try {
      console.log(ev.data)
      var update = JSON.parse(ev.data);
      if (!Array.isArray(update)) {
        // initial full sync.
        this.state = update;
        this.state.events = {};
	if(this.onfullupdate)
		this.onfullupdate();
      } else {
        if (update[0].startsWith('/')) {
          // update has the format key, operation, value here.
          var path = update[0].split('/');
          path.shift();
          if(update[1] == "W") {
            	if(update[2].charAt(0) == 'b') {
			update[2] = update[2] === "btrue" ? true : false
		} else if(update[2].charAt(0) == 'n') {
			if(update[2].indexOf(".") > -1)
                        	update[2] = parseFloat(update[2].substring(1));
			else
                                update[2] = parseInt(update[2].substring(1));
		} else if(update[2].charAt(0) == 's') {
			update[2] = update[2].substring(1);
		}
		//console.debug('changing ' + update[0] + ' from ' +
                //          this.getByPath(this.state, path.slice(0)) +
                //          ' to ' + update[2]);
		this.setByPath(this.state, path.slice(0), update[2]);
	
		var eventName = update[0];
		var eh = this.eventHandlers;
		Object.keys(eh).forEach(function(key) {
    			if (eventName.startsWith(key)) {
				var handlers = eh[key]   
				if (Array.isArray(handlers)) {
                        		handlers.forEach(function(handler) {
                                		handler(eventName, update[2]);
                        		});
   
 				}
			}
				
		});
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
      }}catch(error) {
      if (typeof(this.onReceiveCallback) !== 'undefined') {
        this.onReceiveCallback(ev.data);
      }
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
    onOpen: function() {
	if(this.onready)
		this.onready();
    },
    onReady: function(fn) {
      this.onready = fn;
    },
    onFullUpdate: function(fn) {
      this.onfullupdate = fn;
    },
    send: function(command, key, value) {
     var sock = this.socket;
     var argv = arguments;
      waitForSocketConnection(this.socket, function(){
        sock.send(
          JSON.stringify(
            Array.prototype.slice.call(
              argv)));
      });
    },
    publish: function(key, op, value) {
      if(value == null) {
	value = op;
	op = "W";
      }
	
      this.send('publish', key, op, value);
    },
    getState: function() {
      return this.state;
    },
    register: function(username,password,userdata) {
    	this.socket.send('register\n' + username + '\n' + password + '\n' + userdata + '\n');
    },
    login: function(username,password) {
      if(password)
        this.socket.send('login\n' + username + '\n' + password + '\n');
      else
        this.socket.send('login\n' + username + '\n');
    }
};

  return API;
}));
