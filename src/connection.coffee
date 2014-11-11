"use strict"

_ = require('underscore')
events = require('./events')
WebSocket = require('ws')

class Connection extends events.Events
  # Connection constructor
  # A very simple wrapper class around a web socket connection which knows about
  # the kind of message a myo can receive
  # @param {object} configuration
  constructor: (configuration) ->
    super
    @configuration = _.extend({}, @defaultConfiguration, configuration)
    @url = @configuration.socketUrl + @configuration.apiVersion
    @socket = new @SocketClass(@configuration.socketUrl)
    @socket.onmessage = @onMessage

  SocketClass: WebSocket
  defaultConfiguration: {
    socketUrl: "ws://127.0.0.1:10138/myo/"
    apiVersion: 1
  }
  messageTypes: {
    event: 'event'
  }

  onMessage: (message) =>
    data = JSON.parse(message.data)
    messageType = data[0]
    eventData = data[1]

    if messageType != @messageTypes.event
      throw new Error('Unknown message received: ' + message.toString())

    @trigger('message', eventData)

  close: () ->
    @socket.close() # not sure about that

_.extend(exports, {
  Connection: Connection
})
