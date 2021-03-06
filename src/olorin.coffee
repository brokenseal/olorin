"use strict"

_ = require('underscore')
events = require('./events')
proxy = require('./events/proxy')
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
    @hub.registerMyo(@)

  vibrate: (intensity='medium') ->
    @trigger('command', 'vibrate', {
      type: intensity
    })

  getArm: ->
    return @session.arm || 'unknown'

  getXDirection: ->
    return @session.x_direction || 'unknown'

  requestBluetoothStrength: ->
    @trigger('command', 'request_rssi')

  zeroOrientation: ->
    # set current orientation as the starting point for all future orientation calculations
    if @session?.extra.lastOrientationData
      @session.extra.zeroOrientationOffset = @session.extra.lastOrientationData
    @trigger('zero_orientation')

  destroy: ->
    @trigger('destroy')


class Hub
  # Hub constructor
  # An hub is responsible to keep track of all the myos created and to deliver
  # messages to the correct myo
  # @param {Connection} connection
  # @param {ProxyEventManager} proxyEventManager
  constructor: ({@connection, @proxyEventManager}) ->
    @myos = {}
    @subscriptions = []

    if not @connection
      # add a default connection to this hub
      @connection = new connection.Connection()

    if not @proxyEventManager
      # add a default proxy event manage to this hub
      @proxyEventManager = new proxy.ProxyEventManager()

    @subscriptions.push(@connection.on('message', @onMessage))

  onMessage: (eventData) =>
    myo = @myos[eventData.myo]

    if not myo
      throw new Error('Specified Myo not found')

    @proxyEventManager.handle(myo, eventData)

  registerMyo: (myo) ->
    if myo.id in @myos
      # fail silently
      return

    @myos[myo.id] = myo

    @subscriptions.push(myo.on('command', (command, kwargs) =>
      data = {
        command: command,
        myo: myo.id
      }
      _.extend(data, kwargs)
      @connection.send(JSON.stringify(['command', data]))
    ))

    @subscriptions.push(myo.on('destroy', =>
      @myos[myo.id] = null
    ))

  create: (configuration) ->
    newMyo = new Myo(@, configuration)
    @registerMyo(newMyo)
    return newMyo

  destroy: ->
    subscription.dispose() for subscription in @subscriptions
    @connection.close() # not sure about that


_.extend(exports, {
  Hub: Hub
  Myo: Myo
})
