"use strict"

_ = require('underscore')
events = require('./events')
connection = require('./connection')


class Myo extends events.Events
  @defaultConfiguration = {}
  @id = 0

  # Myo constructor
  # @param {Hub} hub
  # @param {object} configuration
  constructor: (@hub, configuration) ->
    super
    @configuration = _.extend({}, Myo.defaultConfiguration, configuration)
    @id = Myo.id++  # not sure about this one
    @session = null

  vibrate: (intensity='medium') ->
    @trigger('command', 'vibrate', {
      type: intensity
    })

  requestBluetoothStrength: ->
    @trigger('command', 'request_rssi')

  destroy: ->
    @trigger('destroy')


class Hub
  # Hub constructor
  # An hub is responsible to keep track of all the myos created and to deliver
  # messages to the correct myo
  # @param {Connection} connection
  constructor: (@connection, @proxyEventManager) ->
    @myos = {}
    @subscriptions = []
    @subscriptions.push(@connection.on('message', @onMessage))

  onMessage: (eventData) =>
    myo = @myos[eventData.myo]

    if not myo
      throw new Error('Specified Myo not found')

    @proxyEventManager.handle(myo, eventData)

  create: (configuration) ->
    newMyo = new Myo(@, configuration)
    @myos[newMyo.id] = newMyo

    @subscriptions.push(newMyo.on('command', (command, kwargs) =>
      data = {
        command: command,
        myo: newMyo.id
      }
      _.extend(data, kwargs)
      @connection.send(JSON.stringify(['command', data]))
    ))

    @subscriptions.push(newMyo.on('destroy', =>
      @myos[newMyo.id] = null
    ))
    return newMyo

  destroy: ->
    @subscriptions.forEach((subscription)->
      subscription.dispose()
    )
    @connection.close() # not sure about that


_.extend(exports, {
  Hub: Hub
  Myo: Myo
})
