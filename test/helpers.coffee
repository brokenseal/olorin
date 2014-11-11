_ = require('underscore')
connection = require("../src/connection")


class FakeWebSocket
  constructor: (@url) ->
    @onmessage = null

  message: (args...) ->
    @onmessage(args...)

  close: () ->


class FakeConnection extends connection.Connection
  SocketClass: FakeWebSocket


_.extend(exports, {
  FakeConnection: FakeConnection
})
