"use strict"

_ = require('underscore')

class MyoEventHandler
  # this just a simple interface for new event handlers
  invoke: (myo, eventName, eventData) ->
    throw new Error('Not implemented error')


class SimpleProxyEventHandler extends MyoEventHandler
  invoke: (myo, eventName, eventData) ->
    myo.trigger(eventName, eventData)


class DifferentNameEventHandler extends MyoEventHandler
  constructor: (@eventName) ->
  invoke: (myo, eventName, eventData) ->
    myo.trigger(@eventName, eventData)


class AddBehaviorEventHandler extends MyoEventHandler
  constructor: (@additionalBehavior) ->
  invoke: (myo, eventName, eventData) ->
    @additionalBehavior(myo, eventData)
    myo.trigger(@eventName, eventData)


_.extend(exports, {
  MyoEventHandler: MyoEventHandler
  SimpleProxyEventHandler: SimpleProxyEventHandler
  DifferentNameEventHandler: DifferentNameEventHandler
  AddBehaviorEventHandler: AddBehaviorEventHandler
})
