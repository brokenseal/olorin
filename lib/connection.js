"use strict";
var Connection, WebSocket, events, settings, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

settings = require('./settings');

events = require('./events');

WebSocket = require('ws');

Connection = (function(_super) {
  __extends(Connection, _super);

  function Connection(configuration) {
    this.onMessage = __bind(this.onMessage, this);
    Connection.__super__.constructor.apply(this, arguments);
    this.configuration = _.extend({}, this.defaultConfiguration, configuration);
    this.url = this.configuration.socketUrl + this.configuration.apiVersion;
    this.socket = new this.SocketClass(this.url);
    this.socket.onmessage = this.onMessage;
  }

  Connection.prototype.SocketClass = WebSocket;

  Connection.prototype.defaultConfiguration = {
    socketUrl: settings.conf.socketUrl,
    apiVersion: settings.conf.apiVersion
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

  Connection.prototype.send = function(message) {
    console.log(message);
    return this.socket.send(message);
  };

  Connection.prototype.close = function() {
    return this.socket.close();
  };

  return Connection;

})(events.Events);

_.extend(exports, {
  Connection: Connection
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbm5lY3Rpb24uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQUEsQ0FBQTtBQUFBLElBQUEsMENBQUE7RUFBQTs7aVNBQUE7O0FBQUEsQ0FFQSxHQUFJLE9BQUEsQ0FBUSxZQUFSLENBRkosQ0FBQTs7QUFBQSxRQUdBLEdBQVcsT0FBQSxDQUFRLFlBQVIsQ0FIWCxDQUFBOztBQUFBLE1BSUEsR0FBUyxPQUFBLENBQVEsVUFBUixDQUpULENBQUE7O0FBQUEsU0FLQSxHQUFZLE9BQUEsQ0FBUSxJQUFSLENBTFosQ0FBQTs7QUFBQTtBQWFFLCtCQUFBLENBQUE7O0FBQWEsRUFBQSxvQkFBQyxhQUFELEdBQUE7QUFDWCxpREFBQSxDQUFBO0FBQUEsSUFBQSw2Q0FBQSxTQUFBLENBQUEsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLGFBQUQsR0FBaUIsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxFQUFULEVBQWEsSUFBQyxDQUFBLG9CQUFkLEVBQW9DLGFBQXBDLENBRGpCLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxHQUFELEdBQU8sSUFBQyxDQUFBLGFBQWEsQ0FBQyxTQUFmLEdBQTJCLElBQUMsQ0FBQSxhQUFhLENBQUMsVUFGakQsQ0FBQTtBQUFBLElBR0EsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLElBQUMsQ0FBQSxXQUFELENBQWEsSUFBQyxDQUFBLEdBQWQsQ0FIZCxDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsTUFBTSxDQUFDLFNBQVIsR0FBb0IsSUFBQyxDQUFBLFNBSnJCLENBRFc7RUFBQSxDQUFiOztBQUFBLHVCQU9BLFdBQUEsR0FBYSxTQVBiLENBQUE7O0FBQUEsdUJBUUEsb0JBQUEsR0FBc0I7QUFBQSxJQUNwQixTQUFBLEVBQVcsUUFBUSxDQUFDLElBQUksQ0FBQyxTQURMO0FBQUEsSUFFcEIsVUFBQSxFQUFZLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFGTjtHQVJ0QixDQUFBOztBQUFBLHVCQVlBLFlBQUEsR0FBYztBQUFBLElBQ1osS0FBQSxFQUFPLE9BREs7R0FaZCxDQUFBOztBQUFBLHVCQWdCQSxTQUFBLEdBQVcsU0FBQyxPQUFELEdBQUE7QUFDVCxRQUFBLDRCQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sSUFBSSxDQUFDLEtBQUwsQ0FBVyxPQUFPLENBQUMsSUFBbkIsQ0FBUCxDQUFBO0FBQUEsSUFDQSxXQUFBLEdBQWMsSUFBSyxDQUFBLENBQUEsQ0FEbkIsQ0FBQTtBQUFBLElBRUEsU0FBQSxHQUFZLElBQUssQ0FBQSxDQUFBLENBRmpCLENBQUE7QUFJQSxJQUFBLElBQUcsV0FBQSxLQUFpQixJQUFDLENBQUEsWUFBWSxDQUFDLEtBQWxDO0FBQ0UsWUFBVSxJQUFBLEtBQUEsQ0FBTSw0QkFBQSxHQUErQixPQUFPLENBQUMsUUFBUixDQUFBLENBQXJDLENBQVYsQ0FERjtLQUpBO1dBT0EsSUFBQyxDQUFBLE9BQUQsQ0FBUyxTQUFULEVBQW9CLFNBQXBCLEVBUlM7RUFBQSxDQWhCWCxDQUFBOztBQUFBLHVCQTBCQSxJQUFBLEdBQU0sU0FBQyxPQUFELEdBQUE7QUFDSixJQUFBLE9BQU8sQ0FBQyxHQUFSLENBQVksT0FBWixDQUFBLENBQUE7V0FDQSxJQUFDLENBQUEsTUFBTSxDQUFDLElBQVIsQ0FBYSxPQUFiLEVBRkk7RUFBQSxDQTFCTixDQUFBOztBQUFBLHVCQThCQSxLQUFBLEdBQU8sU0FBQSxHQUFBO1dBQ0wsSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFSLENBQUEsRUFESztFQUFBLENBOUJQLENBQUE7O29CQUFBOztHQUx1QixNQUFNLENBQUMsT0FSaEMsQ0FBQTs7QUFBQSxDQThDQyxDQUFDLE1BQUYsQ0FBUyxPQUFULEVBQWtCO0FBQUEsRUFDaEIsVUFBQSxFQUFZLFVBREk7Q0FBbEIsQ0E5Q0EsQ0FBQSIsImZpbGUiOiJjb25uZWN0aW9uLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCJcblxuXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKVxuc2V0dGluZ3MgPSByZXF1aXJlKCcuL3NldHRpbmdzJylcbmV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbldlYlNvY2tldCA9IHJlcXVpcmUoJ3dzJylcblxuXG5jbGFzcyBDb25uZWN0aW9uIGV4dGVuZHMgZXZlbnRzLkV2ZW50c1xuICAjIENvbm5lY3Rpb24gY29uc3RydWN0b3JcbiAgIyBBIHZlcnkgc2ltcGxlIHdyYXBwZXIgY2xhc3MgYXJvdW5kIGEgd2ViIHNvY2tldCBjb25uZWN0aW9uIHdoaWNoIGtub3dzIGFib3V0XG4gICMgdGhlIGtpbmQgb2YgbWVzc2FnZSBhIG15byBjYW4gcmVjZWl2ZVxuICAjIEBwYXJhbSB7b2JqZWN0fSBjb25maWd1cmF0aW9uXG4gIGNvbnN0cnVjdG9yOiAoY29uZmlndXJhdGlvbikgLT5cbiAgICBzdXBlclxuICAgIEBjb25maWd1cmF0aW9uID0gXy5leHRlbmQoe30sIEBkZWZhdWx0Q29uZmlndXJhdGlvbiwgY29uZmlndXJhdGlvbilcbiAgICBAdXJsID0gQGNvbmZpZ3VyYXRpb24uc29ja2V0VXJsICsgQGNvbmZpZ3VyYXRpb24uYXBpVmVyc2lvblxuICAgIEBzb2NrZXQgPSBuZXcgQFNvY2tldENsYXNzKEB1cmwpXG4gICAgQHNvY2tldC5vbm1lc3NhZ2UgPSBAb25NZXNzYWdlXG5cbiAgU29ja2V0Q2xhc3M6IFdlYlNvY2tldFxuICBkZWZhdWx0Q29uZmlndXJhdGlvbjoge1xuICAgIHNvY2tldFVybDogc2V0dGluZ3MuY29uZi5zb2NrZXRVcmxcbiAgICBhcGlWZXJzaW9uOiBzZXR0aW5ncy5jb25mLmFwaVZlcnNpb25cbiAgfVxuICBtZXNzYWdlVHlwZXM6IHtcbiAgICBldmVudDogJ2V2ZW50J1xuICB9XG5cbiAgb25NZXNzYWdlOiAobWVzc2FnZSkgPT5cbiAgICBkYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlLmRhdGEpXG4gICAgbWVzc2FnZVR5cGUgPSBkYXRhWzBdXG4gICAgZXZlbnREYXRhID0gZGF0YVsxXVxuXG4gICAgaWYgbWVzc2FnZVR5cGUgaXNudCBAbWVzc2FnZVR5cGVzLmV2ZW50XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbWVzc2FnZSByZWNlaXZlZDogJyArIG1lc3NhZ2UudG9TdHJpbmcoKSlcblxuICAgIEB0cmlnZ2VyKCdtZXNzYWdlJywgZXZlbnREYXRhKVxuXG4gIHNlbmQ6IChtZXNzYWdlKSAtPlxuICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpXG4gICAgQHNvY2tldC5zZW5kKG1lc3NhZ2UpXG5cbiAgY2xvc2U6IC0+XG4gICAgQHNvY2tldC5jbG9zZSgpICMgbm90IHN1cmUgYWJvdXQgdGhhdFxuXG5fLmV4dGVuZChleHBvcnRzLCB7XG4gIENvbm5lY3Rpb246IENvbm5lY3Rpb25cbn0pXG4iXX0=