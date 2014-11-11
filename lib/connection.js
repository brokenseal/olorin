"use strict";
var Connection, WebSocket, events, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

events = require('./events');

WebSocket = require('ws');

Connection = (function(_super) {
  __extends(Connection, _super);

  function Connection(configuration) {
    this.onMessage = __bind(this.onMessage, this);
    Connection.__super__.constructor.apply(this, arguments);
    this.configuration = _.extend({}, this.defaultConfiguration, configuration);
    this.url = this.configuration.socketUrl + this.configuration.apiVersion;
    this.socket = new this.SocketClass(this.configuration.socketUrl);
    this.socket.onmessage = this.onMessage;
  }

  Connection.prototype.SocketClass = WebSocket;

  Connection.prototype.defaultConfiguration = {
    socketUrl: "ws://127.0.0.1:10138/myo/",
    apiVersion: 1
  };

  Connection.prototype.messageTypes = {
    event: 'event'
  };

  Connection.prototype.onMessage = function(message) {
    var data, eventData, messageType;
    data = JSON.parse(message.data);
    messageType = data[0];
    eventData = data[1];
    if (messageType !== this.messageTypes.event) {
      throw new Error('Unknown message received: ' + message.toString());
    }
    return this.trigger('message', eventData);
  };

  Connection.prototype.close = function() {
    return this.socket.close();
  };

  return Connection;

})(events.Events);

_.extend(exports, {
  Connection: Connection
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbm5lY3Rpb24uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUFBLElBQUEsZ0NBQUE7RUFBQTs7aVNBQUE7O0FBQUEsQ0FFQSxHQUFJLE9BQUEsQ0FBUSxZQUFSLENBRkosQ0FBQTs7QUFBQSxNQUdBLEdBQVMsT0FBQSxDQUFRLFVBQVIsQ0FIVCxDQUFBOztBQUFBLFNBSUEsR0FBWSxPQUFBLENBQVEsSUFBUixDQUpaLENBQUE7O0FBQUE7QUFXRSwrQkFBQSxDQUFBOztBQUFhLEVBQUEsb0JBQUMsYUFBRCxHQUFBO0FBQ1gsaURBQUEsQ0FBQTtBQUFBLElBQUEsNkNBQUEsU0FBQSxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxhQUFELEdBQWlCLENBQUMsQ0FBQyxNQUFGLENBQVMsRUFBVCxFQUFhLElBQUMsQ0FBQSxvQkFBZCxFQUFvQyxhQUFwQyxDQURqQixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsR0FBRCxHQUFPLElBQUMsQ0FBQSxhQUFhLENBQUMsU0FBZixHQUEyQixJQUFDLENBQUEsYUFBYSxDQUFDLFVBRmpELENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxJQUFDLENBQUEsV0FBRCxDQUFhLElBQUMsQ0FBQSxhQUFhLENBQUMsU0FBNUIsQ0FIZCxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsTUFBTSxDQUFDLFNBQVIsR0FBb0IsSUFBQyxDQUFBLFNBSnJCLENBRFc7RUFBQSxDQUFiOztBQUFBLHVCQU9BLFdBQUEsR0FBYSxTQVBiLENBQUE7O0FBQUEsdUJBUUEsb0JBQUEsR0FBc0I7QUFBQSxJQUNwQixTQUFBLEVBQVcsMkJBRFM7QUFBQSxJQUVwQixVQUFBLEVBQVksQ0FGUTtHQVJ0QixDQUFBOztBQUFBLHVCQVlBLFlBQUEsR0FBYztBQUFBLElBQ1osS0FBQSxFQUFPLE9BREs7R0FaZCxDQUFBOztBQUFBLHVCQWdCQSxTQUFBLEdBQVcsU0FBQyxPQUFELEdBQUE7QUFDVCxRQUFBLDRCQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sSUFBSSxDQUFDLEtBQUwsQ0FBVyxPQUFPLENBQUMsSUFBbkIsQ0FBUCxDQUFBO0FBQUEsSUFDQSxXQUFBLEdBQWMsSUFBSyxDQUFBLENBQUEsQ0FEbkIsQ0FBQTtBQUFBLElBRUEsU0FBQSxHQUFZLElBQUssQ0FBQSxDQUFBLENBRmpCLENBQUE7QUFJQSxJQUFBLElBQUcsV0FBQSxLQUFlLElBQUMsQ0FBQSxZQUFZLENBQUMsS0FBaEM7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLDRCQUFBLEdBQStCLE9BQU8sQ0FBQyxRQUFSLENBQUEsQ0FBckMsQ0FBVixDQURGO0tBSkE7V0FPQSxJQUFDLENBQUEsT0FBRCxDQUFTLFNBQVQsRUFBb0IsU0FBcEIsRUFSUztFQUFBLENBaEJYLENBQUE7O0FBQUEsdUJBMEJBLEtBQUEsR0FBTyxTQUFBLEdBQUE7V0FDTCxJQUFDLENBQUEsTUFBTSxDQUFDLEtBQVIsQ0FBQSxFQURLO0VBQUEsQ0ExQlAsQ0FBQTs7b0JBQUE7O0dBTHVCLE1BQU0sQ0FBQyxPQU5oQyxDQUFBOztBQUFBLENBd0NDLENBQUMsTUFBRixDQUFTLE9BQVQsRUFBa0I7QUFBQSxFQUNoQixVQUFBLEVBQVksVUFESTtDQUFsQixDQXhDQSxDQUFBIiwiZmlsZSI6ImNvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIlxuXG5fID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5ldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG5XZWJTb2NrZXQgPSByZXF1aXJlKCd3cycpXG5cbmNsYXNzIENvbm5lY3Rpb24gZXh0ZW5kcyBldmVudHMuRXZlbnRzXG4gICMgQ29ubmVjdGlvbiBjb25zdHJ1Y3RvclxuICAjIEEgdmVyeSBzaW1wbGUgd3JhcHBlciBjbGFzcyBhcm91bmQgYSB3ZWIgc29ja2V0IGNvbm5lY3Rpb24gd2hpY2gga25vd3MgYWJvdXRcbiAgIyB0aGUga2luZCBvZiBtZXNzYWdlIGEgbXlvIGNhbiByZWNlaXZlXG4gICMgQHBhcmFtIHtvYmplY3R9IGNvbmZpZ3VyYXRpb25cbiAgY29uc3RydWN0b3I6IChjb25maWd1cmF0aW9uKSAtPlxuICAgIHN1cGVyXG4gICAgQGNvbmZpZ3VyYXRpb24gPSBfLmV4dGVuZCh7fSwgQGRlZmF1bHRDb25maWd1cmF0aW9uLCBjb25maWd1cmF0aW9uKVxuICAgIEB1cmwgPSBAY29uZmlndXJhdGlvbi5zb2NrZXRVcmwgKyBAY29uZmlndXJhdGlvbi5hcGlWZXJzaW9uXG4gICAgQHNvY2tldCA9IG5ldyBAU29ja2V0Q2xhc3MoQGNvbmZpZ3VyYXRpb24uc29ja2V0VXJsKVxuICAgIEBzb2NrZXQub25tZXNzYWdlID0gQG9uTWVzc2FnZVxuXG4gIFNvY2tldENsYXNzOiBXZWJTb2NrZXRcbiAgZGVmYXVsdENvbmZpZ3VyYXRpb246IHtcbiAgICBzb2NrZXRVcmw6IFwid3M6Ly8xMjcuMC4wLjE6MTAxMzgvbXlvL1wiXG4gICAgYXBpVmVyc2lvbjogMVxuICB9XG4gIG1lc3NhZ2VUeXBlczoge1xuICAgIGV2ZW50OiAnZXZlbnQnXG4gIH1cblxuICBvbk1lc3NhZ2U6IChtZXNzYWdlKSA9PlxuICAgIGRhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UuZGF0YSlcbiAgICBtZXNzYWdlVHlwZSA9IGRhdGFbMF1cbiAgICBldmVudERhdGEgPSBkYXRhWzFdXG5cbiAgICBpZiBtZXNzYWdlVHlwZSAhPSBAbWVzc2FnZVR5cGVzLmV2ZW50XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbWVzc2FnZSByZWNlaXZlZDogJyArIG1lc3NhZ2UudG9TdHJpbmcoKSlcblxuICAgIEB0cmlnZ2VyKCdtZXNzYWdlJywgZXZlbnREYXRhKVxuXG4gIGNsb3NlOiAoKSAtPlxuICAgIEBzb2NrZXQuY2xvc2UoKSAjIG5vdCBzdXJlIGFib3V0IHRoYXRcblxuXy5leHRlbmQoZXhwb3J0cywge1xuICBDb25uZWN0aW9uOiBDb25uZWN0aW9uXG59KVxuIl19