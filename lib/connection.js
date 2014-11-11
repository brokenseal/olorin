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
    console.log('socket', this.socket);
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
    return this.trigger('message', messageType, eventData);
  };

  Connection.prototype.close = function() {
    return this.socket.close();
  };

  return Connection;

})(events.Events);

_.extend(exports, {
  Connection: Connection
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbm5lY3Rpb24uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0NBQUE7RUFBQTs7aVNBQUE7O0FBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxZQUFSLENBQUosQ0FBQTs7QUFBQSxNQUNBLEdBQVMsT0FBQSxDQUFRLFVBQVIsQ0FEVCxDQUFBOztBQUFBLFNBRUEsR0FBWSxPQUFBLENBQVEsSUFBUixDQUZaLENBQUE7O0FBQUE7QUFRSSwrQkFBQSxDQUFBOztBQUFhLEVBQUEsb0JBQUMsYUFBRCxHQUFBO0FBQ1QsaURBQUEsQ0FBQTtBQUFBLElBQUEsNkNBQUEsU0FBQSxDQUFBLENBQUE7QUFBQSxJQUNBLElBQUMsQ0FBQSxhQUFELEdBQWlCLENBQUMsQ0FBQyxNQUFGLENBQVMsRUFBVCxFQUFhLElBQUMsQ0FBQSxvQkFBZCxFQUFvQyxhQUFwQyxDQURqQixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsR0FBRCxHQUFPLElBQUMsQ0FBQSxhQUFhLENBQUMsU0FBZixHQUEyQixJQUFDLENBQUEsYUFBYSxDQUFDLFVBRmpELENBQUE7QUFBQSxJQUdBLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxJQUFDLENBQUEsV0FBRCxDQUFhLElBQUMsQ0FBQSxhQUFhLENBQUMsU0FBNUIsQ0FIZCxDQUFBO0FBQUEsSUFJQSxPQUFPLENBQUMsR0FBUixDQUFZLFFBQVosRUFBc0IsSUFBQyxDQUFBLE1BQXZCLENBSkEsQ0FBQTtBQUFBLElBS0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxTQUFSLEdBQW9CLElBQUMsQ0FBQSxTQUxyQixDQURTO0VBQUEsQ0FBYjs7QUFBQSx1QkFRQSxXQUFBLEdBQWEsU0FSYixDQUFBOztBQUFBLHVCQVNBLG9CQUFBLEdBQXNCO0FBQUEsSUFDbEIsU0FBQSxFQUFXLDJCQURPO0FBQUEsSUFFbEIsVUFBQSxFQUFZLENBRk07R0FUdEIsQ0FBQTs7QUFBQSx1QkFhQSxZQUFBLEdBQWM7QUFBQSxJQUNWLEtBQUEsRUFBTyxPQURHO0dBYmQsQ0FBQTs7QUFBQSx1QkFpQkEsU0FBQSxHQUFXLFNBQUMsT0FBRCxHQUFBO0FBQ1AsUUFBQSw0QkFBQTtBQUFBLElBQUEsSUFBQSxHQUFPLElBQUksQ0FBQyxLQUFMLENBQVcsT0FBTyxDQUFDLElBQW5CLENBQVAsQ0FBQTtBQUFBLElBQ0EsV0FBQSxHQUFjLElBQUssQ0FBQSxDQUFBLENBRG5CLENBQUE7QUFBQSxJQUVBLFNBQUEsR0FBWSxJQUFLLENBQUEsQ0FBQSxDQUZqQixDQUFBO0FBSUEsSUFBQSxJQUFHLFdBQUEsS0FBZSxJQUFDLENBQUEsWUFBWSxDQUFDLEtBQWhDO0FBQ0ksWUFBVSxJQUFBLEtBQUEsQ0FBTSw0QkFBQSxHQUErQixPQUFPLENBQUMsUUFBUixDQUFBLENBQXJDLENBQVYsQ0FESjtLQUpBO1dBT0EsSUFBQyxDQUFBLE9BQUQsQ0FBUyxTQUFULEVBQW9CLFdBQXBCLEVBQWlDLFNBQWpDLEVBUk87RUFBQSxDQWpCWCxDQUFBOztBQUFBLHVCQTJCQSxLQUFBLEdBQU8sU0FBQSxHQUFBO1dBQ0gsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQUEsRUFERztFQUFBLENBM0JQLENBQUE7O29CQUFBOztHQUpxQixNQUFNLENBQUMsT0FKaEMsQ0FBQTs7QUFBQSxDQXNDQyxDQUFDLE1BQUYsQ0FBUyxPQUFULEVBQWtCO0FBQUEsRUFDZCxVQUFBLEVBQVksVUFERTtDQUFsQixDQXRDQSxDQUFBIiwiZmlsZSI6ImNvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJfID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5ldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG5XZWJTb2NrZXQgPSByZXF1aXJlKCd3cycpXG5cbmNsYXNzIENvbm5lY3Rpb24gZXh0ZW5kcyBldmVudHMuRXZlbnRzXG4gICAgIyBDb25uZWN0aW9uIGNvbnN0cnVjdG9yXG4gICAgIyBBIHZlcnkgc2ltcGxlIHdyYXBwZXIgY2xhc3MgYXJvdW5kIGEgd2ViIHNvY2tldCBjb25uZWN0aW9uIHdoaWNoIGtub3dzIGFib3V0IHRoZSBraW5kIG9mIG1lc3NhZ2UgYSBteW8gY2FuIHJlY2VpdmVcbiAgICAjIEBwYXJhbSB7b2JqZWN0fSBjb25maWd1cmF0aW9uXG4gICAgY29uc3RydWN0b3I6IChjb25maWd1cmF0aW9uKSAtPlxuICAgICAgICBzdXBlclxuICAgICAgICBAY29uZmlndXJhdGlvbiA9IF8uZXh0ZW5kKHt9LCBAZGVmYXVsdENvbmZpZ3VyYXRpb24sIGNvbmZpZ3VyYXRpb24pXG4gICAgICAgIEB1cmwgPSBAY29uZmlndXJhdGlvbi5zb2NrZXRVcmwgKyBAY29uZmlndXJhdGlvbi5hcGlWZXJzaW9uXG4gICAgICAgIEBzb2NrZXQgPSBuZXcgQFNvY2tldENsYXNzKEBjb25maWd1cmF0aW9uLnNvY2tldFVybClcbiAgICAgICAgY29uc29sZS5sb2coJ3NvY2tldCcsIEBzb2NrZXQpXG4gICAgICAgIEBzb2NrZXQub25tZXNzYWdlID0gQG9uTWVzc2FnZVxuXG4gICAgU29ja2V0Q2xhc3M6IFdlYlNvY2tldFxuICAgIGRlZmF1bHRDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHNvY2tldFVybDogXCJ3czovLzEyNy4wLjAuMToxMDEzOC9teW8vXCJcbiAgICAgICAgYXBpVmVyc2lvbjogMVxuICAgIH1cbiAgICBtZXNzYWdlVHlwZXM6IHtcbiAgICAgICAgZXZlbnQ6ICdldmVudCdcbiAgICB9XG5cbiAgICBvbk1lc3NhZ2U6IChtZXNzYWdlKSA9PlxuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlLmRhdGEpXG4gICAgICAgIG1lc3NhZ2VUeXBlID0gZGF0YVswXVxuICAgICAgICBldmVudERhdGEgPSBkYXRhWzFdXG5cbiAgICAgICAgaWYgbWVzc2FnZVR5cGUgIT0gQG1lc3NhZ2VUeXBlcy5ldmVudFxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG1lc3NhZ2UgcmVjZWl2ZWQ6ICcgKyBtZXNzYWdlLnRvU3RyaW5nKCkpXG5cbiAgICAgICAgQHRyaWdnZXIoJ21lc3NhZ2UnLCBtZXNzYWdlVHlwZSwgZXZlbnREYXRhKVxuXG4gICAgY2xvc2U6ICgpIC0+XG4gICAgICAgIEBzb2NrZXQuY2xvc2UoKSAjIG5vdCBzdXJlIGFib3V0IHRoYXRcblxuXy5leHRlbmQoZXhwb3J0cywge1xuICAgIENvbm5lY3Rpb246IENvbm5lY3Rpb25cbn0pXG4iXX0=