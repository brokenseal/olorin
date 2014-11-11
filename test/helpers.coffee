_ = require('underscore')
connection = require("../src/connection")


class FakeWebSocket
  constructor: (@url) ->
    @onmessage = null

  message: (args...) ->
    @onmessage(args...)

  send: () ->
  close: () ->


class FakeConnection extends connection.Connection
  SocketClass: FakeWebSocket


_.extend(exports, {
  FakeConnection: FakeConnection
})
