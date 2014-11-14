"use strict"

_ = require('underscore')

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


class Session
  @removeSession: (myo) ->
    if myo.session
      myo.session.close()

    myo.session = null

  # Session constructor
  # @param {Number} messageQueueLimit
  constructor: (@messageQueueLimit) ->
    @pose = null
    @messagesQueue = new MessageQueue(@messageQueueLimit)
    @arm = @direction = @version = @connectedTimestamp = @armRecognizedTimestamp = null

    # this object can be used by custom events to store additional data
    @extra = {}

  initialize: ->
    # here I want to add an initialization of the user session on the armband,
    # registering common actions just to know the user better and adapt to his
    # habits every person has a different strength when performing different
    # actions, registering common actions will make it easier to adapt
    # actions based on user's sensitivity

  onConnected: (version, @connectedTimestamp) ->
    @version = version.join('.')

  onArmRecognized: (@arm, @direction, @armRecognizedTimestamp) ->

  close: ->
    # do something? empty the message queue?


_.extend(exports, {
  Session: Session
})
