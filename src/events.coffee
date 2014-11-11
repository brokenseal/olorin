"use strict"

_ = require('underscore')


class Subscription
  constructor: (@callback, @index, @subscriptionList) ->

  invoke: (args...)->
    @callback(args...)

  dispose: ->
    @subscriptionList.splice(@index, 0)


class Events
  constructor: () ->
    @events = {}

  on: (eventName, listener) ->
    if !@events[eventName]
      !@events[eventName] = []  # new subscription list for this new event

    subscriptionList = @events[eventName]
    subscription = new Subscription(
      listener,
      subscriptionList.length,
      subscriptionList
    )
    subscriptionList.push(subscription)
    return subscription

  trigger: (eventName, args...) ->
    subscriptionList = @events[eventName] || []
    len = subscriptionList.length

    while len--
      subscription = subscriptionList[len]
      subscription.invoke(args...)

  off: (eventName) ->
    @events[eventName] = []


class Event
  constructor: (@name, @data) ->


_.extend(exports, {
  Event: Event
  Events: Events
  Subscription: Subscription
})
