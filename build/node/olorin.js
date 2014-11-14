"use strict";
var Hub, Myo, connection, events, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('underscore');

events = require('./events');

connection = require('./connection');

Myo = (function(_super) {
  __extends(Myo, _super);

  Myo.defaultConfiguration = {};

  Myo.id = 0;

  function Myo(hub, configuration) {
    this.hub = hub;
    Myo.__super__.constructor.apply(this, arguments);
    this.configuration = _.extend({}, Myo.defaultConfiguration, configuration);
    this.id = Myo.id++;
    this.session = null;
  }

  Myo.prototype.vibrate = function(intensity) {
    if (intensity == null) {
      intensity = 'medium';
    }
    return this.trigger('command', 'vibrate', {
      type: intensity
    });
  };

  Myo.prototype.requestBluetoothStrength = function() {
    return this.trigger('command', 'request_rssi');
  };

  Myo.prototype.zeroOrientation = function() {
    var _ref;
    if ((_ref = this.session) != null ? _ref.extra.lastOrientationData : void 0) {
      this.session.extra.zeroOrientationOffset = this.session.extra.lastOrientationData;
    }
    return this.trigger('zero_orientation');
  };

  Myo.prototype.destroy = function() {
    return this.trigger('destroy');
  };

  return Myo;

})(events.Events);

Hub = (function() {
  function Hub(_arg) {
    this.connection = _arg.connection, this.proxyEventManager = _arg.proxyEventManager;
    this.onMessage = __bind(this.onMessage, this);
    this.myos = {};
    this.subscriptions = [];
    if (!this.connection) {
      this.connection = new connection.Connection();
    }
    if (!this.proxyEventManager) {
      this.proxyEventManager = new events.ProxyEventManager();
    }
    this.subscriptions.push(this.connection.on('message', this.onMessage));
  }

  Hub.prototype.onMessage = function(eventData) {
    var myo;
    myo = this.myos[eventData.myo];
    if (!myo) {
      throw new Error('Specified Myo not found');
    }
    return this.proxyEventManager.handle(myo, eventData);
  };

  Hub.prototype.registerMyo = function(myo) {
    var _ref;
    if (_ref = myo.id, __indexOf.call(this.myos, _ref) >= 0) {
      throw new Error('Myo already registered');
    }
    this.myos[myo.id] = myo;
    this.subscriptions.push(myo.on('command', (function(_this) {
      return function(command, kwargs) {
        var data;
        data = {
          command: command,
          myo: myo.id
        };
        _.extend(data, kwargs);
        return _this.connection.send(JSON.stringify(['command', data]));
      };
    })(this)));
    return this.subscriptions.push(myo.on('destroy', (function(_this) {
      return function() {
        return _this.myos[myo.id] = null;
      };
    })(this)));
  };

  Hub.prototype.create = function(configuration) {
    var newMyo;
    newMyo = new Myo(this, configuration);
    this.registerMyo(newMyo);
    return newMyo;
  };

  Hub.prototype.destroy = function() {
    var subscription, _i, _len, _ref;
    _ref = this.subscriptions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      subscription = _ref[_i];
      subscription.dispose();
    }
    return this.connection.close();
  };

  return Hub;

})();

_.extend(exports, {
  Hub: Hub,
  Myo: Myo
});

//# sourceMappingURL=data:application/json;base64,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LENBQWxCLENBQXBCLENBTEEsQ0FBQTtXQWNBLElBQUMsQ0FBQSxhQUFhLENBQUMsSUFBZixDQUFvQixHQUFHLENBQUMsRUFBSixDQUFPLFNBQVAsRUFBa0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUEsR0FBQTtlQUNwQyxLQUFDLENBQUEsSUFBSyxDQUFBLEdBQUcsQ0FBQyxFQUFKLENBQU4sR0FBZ0IsS0FEb0I7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFsQixDQUFwQixFQWZXO0VBQUEsQ0F0QmIsQ0FBQTs7QUFBQSxnQkF5Q0EsTUFBQSxHQUFRLFNBQUMsYUFBRCxHQUFBO0FBQ04sUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQWEsSUFBQSxHQUFBLENBQUksSUFBSixFQUFPLGFBQVAsQ0FBYixDQUFBO0FBQUEsSUFDQSxJQUFDLENBQUEsV0FBRCxDQUFhLE1BQWIsQ0FEQSxDQUFBO0FBRUEsV0FBTyxNQUFQLENBSE07RUFBQSxDQXpDUixDQUFBOztBQUFBLGdCQThDQSxPQUFBLEdBQVMsU0FBQSxHQUFBO0FBQ1AsUUFBQSw0QkFBQTtBQUFBO0FBQUEsU0FBQSwyQ0FBQTs4QkFBQTtBQUFBLE1BQUEsWUFBWSxDQUFDLE9BQWIsQ0FBQSxDQUFBLENBQUE7QUFBQSxLQUFBO1dBQ0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxLQUFaLENBQUEsRUFGTztFQUFBLENBOUNULENBQUE7O2FBQUE7O0lBM0NGLENBQUE7O0FBQUEsQ0E4RkMsQ0FBQyxNQUFGLENBQVMsT0FBVCxFQUFrQjtBQUFBLEVBQ2hCLEdBQUEsRUFBSyxHQURXO0FBQUEsRUFFaEIsR0FBQSxFQUFLLEdBRlc7Q0FBbEIsQ0E5RkEsQ0FBQSIsImZpbGUiOiJvbG9yaW4uanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIlxuXG5fID0gcmVxdWlyZSgndW5kZXJzY29yZScpXG5ldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG5jb25uZWN0aW9uID0gcmVxdWlyZSgnLi9jb25uZWN0aW9uJylcblxuXG5jbGFzcyBNeW8gZXh0ZW5kcyBldmVudHMuRXZlbnRzXG4gIEBkZWZhdWx0Q29uZmlndXJhdGlvbiA9IHt9XG4gIEBpZCA9IDBcblxuICAjIE15byBjb25zdHJ1Y3RvclxuICAjIEBwYXJhbSB7SHVifSBodWJcbiAgIyBAcGFyYW0ge29iamVjdH0gY29uZmlndXJhdGlvblxuICBjb25zdHJ1Y3RvcjogKEBodWIsIGNvbmZpZ3VyYXRpb24pIC0+XG4gICAgc3VwZXJcbiAgICBAY29uZmlndXJhdGlvbiA9IF8uZXh0ZW5kKHt9LCBNeW8uZGVmYXVsdENvbmZpZ3VyYXRpb24sIGNvbmZpZ3VyYXRpb24pXG4gICAgQGlkID0gTXlvLmlkKysgICMgbm90IHN1cmUgYWJvdXQgdGhpcyBvbmVcbiAgICBAc2Vzc2lvbiA9IG51bGxcblxuICB2aWJyYXRlOiAoaW50ZW5zaXR5PSdtZWRpdW0nKSAtPlxuICAgIEB0cmlnZ2VyKCdjb21tYW5kJywgJ3ZpYnJhdGUnLCB7XG4gICAgICB0eXBlOiBpbnRlbnNpdHlcbiAgICB9KVxuXG4gIHJlcXVlc3RCbHVldG9vdGhTdHJlbmd0aDogLT5cbiAgICBAdHJpZ2dlcignY29tbWFuZCcsICdyZXF1ZXN0X3Jzc2knKVxuXG4gIHplcm9PcmllbnRhdGlvbjogLT5cbiAgICAjIHNldCBjdXJyZW50IG9yaWVudGF0aW9uIGFzIHRoZSBzdGFydGluZyBwb2ludCBmb3IgYWxsIGZ1dHVyZSBvcmllbnRhdGlvbiBjYWxjdWxhdGlvbnNcbiAgICBpZiBAc2Vzc2lvbj8uZXh0cmEubGFzdE9yaWVudGF0aW9uRGF0YVxuICAgICAgQHNlc3Npb24uZXh0cmEuemVyb09yaWVudGF0aW9uT2Zmc2V0ID0gQHNlc3Npb24uZXh0cmEubGFzdE9yaWVudGF0aW9uRGF0YVxuICAgIEB0cmlnZ2VyKCd6ZXJvX29yaWVudGF0aW9uJylcblxuICBkZXN0cm95OiAtPlxuICAgIEB0cmlnZ2VyKCdkZXN0cm95JylcblxuXG5jbGFzcyBIdWJcbiAgIyBIdWIgY29uc3RydWN0b3JcbiAgIyBBbiBodWIgaXMgcmVzcG9uc2libGUgdG8ga2VlcCB0cmFjayBvZiBhbGwgdGhlIG15b3MgY3JlYXRlZCBhbmQgdG8gZGVsaXZlclxuICAjIG1lc3NhZ2VzIHRvIHRoZSBjb3JyZWN0IG15b1xuICAjIEBwYXJhbSB7Q29ubmVjdGlvbn0gY29ubmVjdGlvblxuICBjb25zdHJ1Y3RvcjogKHtAY29ubmVjdGlvbiwgQHByb3h5RXZlbnRNYW5hZ2VyfSkgLT5cbiAgICBAbXlvcyA9IHt9XG4gICAgQHN1YnNjcmlwdGlvbnMgPSBbXVxuXG4gICAgaWYgbm90IEBjb25uZWN0aW9uXG4gICAgICAjIGFkZCBhIGRlZmF1bHQgY29ubmVjdGlvbiB0byB0aGlzIGh1YlxuICAgICAgQGNvbm5lY3Rpb24gPSBuZXcgY29ubmVjdGlvbi5Db25uZWN0aW9uKClcblxuICAgIGlmIG5vdCBAcHJveHlFdmVudE1hbmFnZXJcbiAgICAgICMgYWRkIGEgZGVmYXVsdCBwcm94eSBldmVudCBtYW5hZ2UgdG8gdGhpcyBodWJcbiAgICAgIEBwcm94eUV2ZW50TWFuYWdlciA9IG5ldyBldmVudHMuUHJveHlFdmVudE1hbmFnZXIoKVxuXG4gICAgQHN1YnNjcmlwdGlvbnMucHVzaChAY29ubmVjdGlvbi5vbignbWVzc2FnZScsIEBvbk1lc3NhZ2UpKVxuXG4gIG9uTWVzc2FnZTogKGV2ZW50RGF0YSkgPT5cbiAgICBteW8gPSBAbXlvc1tldmVudERhdGEubXlvXVxuXG4gICAgaWYgbm90IG15b1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTcGVjaWZpZWQgTXlvIG5vdCBmb3VuZCcpXG5cbiAgICBAcHJveHlFdmVudE1hbmFnZXIuaGFuZGxlKG15bywgZXZlbnREYXRhKVxuXG4gIHJlZ2lzdGVyTXlvOiAobXlvKSAtPlxuICAgIGlmIG15by5pZCBpbiBAbXlvc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNeW8gYWxyZWFkeSByZWdpc3RlcmVkJylcblxuICAgIEBteW9zW215by5pZF0gPSBteW9cblxuICAgIEBzdWJzY3JpcHRpb25zLnB1c2gobXlvLm9uKCdjb21tYW5kJywgKGNvbW1hbmQsIGt3YXJncykgPT5cbiAgICAgIGRhdGEgPSB7XG4gICAgICAgIGNvbW1hbmQ6IGNvbW1hbmQsXG4gICAgICAgIG15bzogbXlvLmlkXG4gICAgICB9XG4gICAgICBfLmV4dGVuZChkYXRhLCBrd2FyZ3MpXG4gICAgICBAY29ubmVjdGlvbi5zZW5kKEpTT04uc3RyaW5naWZ5KFsnY29tbWFuZCcsIGRhdGFdKSlcbiAgICApKVxuXG4gICAgQHN1YnNjcmlwdGlvbnMucHVzaChteW8ub24oJ2Rlc3Ryb3knLCA9PlxuICAgICAgQG15b3NbbXlvLmlkXSA9IG51bGxcbiAgICApKVxuXG4gIGNyZWF0ZTogKGNvbmZpZ3VyYXRpb24pIC0+XG4gICAgbmV3TXlvID0gbmV3IE15byhALCBjb25maWd1cmF0aW9uKVxuICAgIEByZWdpc3Rlck15byhuZXdNeW8pXG4gICAgcmV0dXJuIG5ld015b1xuXG4gIGRlc3Ryb3k6IC0+XG4gICAgc3Vic2NyaXB0aW9uLmRpc3Bvc2UoKSBmb3Igc3Vic2NyaXB0aW9uIGluIEBzdWJzY3JpcHRpb25zXG4gICAgQGNvbm5lY3Rpb24uY2xvc2UoKSAjIG5vdCBzdXJlIGFib3V0IHRoYXRcblxuXG5fLmV4dGVuZChleHBvcnRzLCB7XG4gIEh1YjogSHViXG4gIE15bzogTXlvXG59KVxuIl19