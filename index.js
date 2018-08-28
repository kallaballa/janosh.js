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
    subscribe: function(eventName, fn) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
      this.eventHandlers[eventName].push(fn);
    },
    onError: function(fn) {
      this.socket.onerror = fn;
    },
    onOpen: function(ev) {
      this.socket.send('setup');
    },
    send: function(command, key, value) {
      this.socket.send(
        JSON.stringify(
          Array.prototype.slice.call(
            arguments)));
    },
    command: function(command, param) {
      param = typeof(param) === 'undefined' ? '' : param;
      console.debug('executing '+command+'('+param+')');
      this.send('publish', command, 'W', param);
    },
  };

  return API;
}));
