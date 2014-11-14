"use strict"

_ = require('underscore')
proxy = require('./proxy')


class MessageQueue
  constructor: (@limit=1000)->
    @queue = []

  purge: ->
    if @queue.length > @limit
      @queue.splice(@limit, @queue.length - @limit)

  push: (object) ->
    @purge()
    return @queue.push(object)

  getLastItems: (length=100) ->
    return @queue.slice(0, length)


class Subscription
  constructor: (@callback, @index, @subscriptionList) ->

  invoke: (args...)->
    @callback(args...)

  dispose: ->
    @subscriptionList.splice(@index, 0)


class Events
  constructor: ->
    @events = {}

  on: (eventName, listener) ->
    if not @events[eventName]
      @events[eventName] = []  # new subscription list for this new event

    subscriptionList = @events[eventName]
    subscription = new Subscription(
      listener,
      subscriptionList.length,
      subscriptionList
    )
    subscriptionList.push(subscription)
    return subscription

  once: (eventName, listener) ->
    subscription = @on(eventName, (args...)->
      subscription.dispose()
      listener(args...)
    )
    return subscription

  trigger: (eventName, args...) ->
    subscriptionList = @events[eventName] or []
    len = subscriptionList.length

    while len--
      subscription = subscriptionList[len]
      subscription.invoke(args...)

  off: (eventName) ->
    # this can be used to remove all subscriptions to a specific event, to
    # dispose single subscription use the dispose method on them
    @events[eventName] = []


_.extend(exports, {
  Events: Events
  Subscription: Subscription
})
