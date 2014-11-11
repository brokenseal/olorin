"use strict"

_ = require('underscore')
settings = require('./settings')
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
    console.log('connecting to:', @url)
    @socket = new @SocketClass(@url)
    @socket.onmessage = @onMessage

  SocketClass: WebSocket
  defaultConfiguration: {
    socketUrl: settings.conf.socketUrl
    apiVersion: settings.conf.apiVersion
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

  send: (message) ->
    console.log(message)
    @socket.send(message)

  close: () ->
    @socket.close() # not sure about that

_.extend(exports, {
  Connection: Connection
})
