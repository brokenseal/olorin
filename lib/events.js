"use strict";
var Event, Events, Subscription, _,
  __slice = [].slice;

_ = require('underscore');

Subscription = (function() {
  function Subscription(callback, index, subscriptionList) {
    this.callback = callback;
    this.index = index;
    this.subscriptionList = subscriptionList;
  }

  Subscription.prototype.invoke = function() {
    var args;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return this.callback.apply(this, args);
  };

  Subscription.prototype.dispose = function() {
    return this.subscriptionList.splice(this.index, 0);
  };

  return Subscription;

})();

Events = (function() {
  function Events() {
    this.events = {};
  }

  Events.prototype.on = function(eventName, listener) {
    var subscription, subscriptionList;
    if (!this.events[eventName]) {
      !(this.events[eventName] = []);
    }
    subscriptionList = this.events[eventName];
    subscription = new Subscription(listener, subscriptionList.length, subscriptionList);
    subscriptionList.push(subscription);
    return subscription;
  };

  Events.prototype.trigger = function() {
    var args, eventName, len, subscription, subscriptionList, _results;
    eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    subscriptionList = this.events[eventName] || [];
    len = subscriptionList.length;
    _results = [];
    while (len--) {
      subscription = subscriptionList[len];
      _results.push(subscription.invoke.apply(subscription, args));
    }
    return _results;
  };

  Events.prototype.off = function(eventName) {
    return this.events[eventName] = [];
  };

  return Events;

})();

Event = (function() {
  function Event(name, data) {
    this.name = name;
    this.data = data;
  }

  return Event;

})();

_.extend(exports, {
  Event: Event,
  Events: Events,
  Subscription: Subscription
});

//# sourceMappingURL=data:application/json;base64,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QUhFO0NBQWxCLENBaERBLENBQUEiLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCJcblxuXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKVxuXG5cbmNsYXNzIFN1YnNjcmlwdGlvblxuICBjb25zdHJ1Y3RvcjogKEBjYWxsYmFjaywgQGluZGV4LCBAc3Vic2NyaXB0aW9uTGlzdCkgLT5cblxuICBpbnZva2U6IChhcmdzLi4uKS0+XG4gICAgQGNhbGxiYWNrKGFyZ3MuLi4pXG5cbiAgZGlzcG9zZTogLT5cbiAgICBAc3Vic2NyaXB0aW9uTGlzdC5zcGxpY2UoQGluZGV4LCAwKVxuXG5cbmNsYXNzIEV2ZW50c1xuICBjb25zdHJ1Y3RvcjogKCkgLT5cbiAgICBAZXZlbnRzID0ge31cblxuICBvbjogKGV2ZW50TmFtZSwgbGlzdGVuZXIpIC0+XG4gICAgaWYgIUBldmVudHNbZXZlbnROYW1lXVxuICAgICAgIUBldmVudHNbZXZlbnROYW1lXSA9IFtdICAjIG5ldyBzdWJzY3JpcHRpb24gbGlzdCBmb3IgdGhpcyBuZXcgZXZlbnRcblxuICAgIHN1YnNjcmlwdGlvbkxpc3QgPSBAZXZlbnRzW2V2ZW50TmFtZV1cbiAgICBzdWJzY3JpcHRpb24gPSBuZXcgU3Vic2NyaXB0aW9uKFxuICAgICAgbGlzdGVuZXIsXG4gICAgICBzdWJzY3JpcHRpb25MaXN0Lmxlbmd0aCxcbiAgICAgIHN1YnNjcmlwdGlvbkxpc3RcbiAgICApXG4gICAgc3Vic2NyaXB0aW9uTGlzdC5wdXNoKHN1YnNjcmlwdGlvbilcbiAgICByZXR1cm4gc3Vic2NyaXB0aW9uXG5cbiAgdHJpZ2dlcjogKGV2ZW50TmFtZSwgYXJncy4uLikgLT5cbiAgICBzdWJzY3JpcHRpb25MaXN0ID0gQGV2ZW50c1tldmVudE5hbWVdIHx8IFtdXG4gICAgbGVuID0gc3Vic2NyaXB0aW9uTGlzdC5sZW5ndGhcblxuICAgIHdoaWxlIGxlbi0tXG4gICAgICBzdWJzY3JpcHRpb24gPSBzdWJzY3JpcHRpb25MaXN0W2xlbl1cbiAgICAgIHN1YnNjcmlwdGlvbi5pbnZva2UoYXJncy4uLilcblxuICBvZmY6IChldmVudE5hbWUpIC0+XG4gICAgQGV2ZW50c1tldmVudE5hbWVdID0gW11cblxuXG5jbGFzcyBFdmVudFxuICBjb25zdHJ1Y3RvcjogKEBuYW1lLCBAZGF0YSkgLT5cblxuXG5fLmV4dGVuZChleHBvcnRzLCB7XG4gIEV2ZW50OiBFdmVudFxuICBFdmVudHM6IEV2ZW50c1xuICBTdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvblxufSlcbiJdfQ==