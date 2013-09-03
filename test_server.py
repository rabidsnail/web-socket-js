import tornado.web as web
import tornado.websocket as websocket

socket_ctr = 0
class SocketHandler(websocket.WebSocketHandler):

    def open(self):
        global socket_ctr
        self.sid = socket_ctr
        socket_ctr += 1
        print '%d: socket opened' % self.sid

    def on_message(self, message):
        print '%d: message: %s' % (self.sid,  message)
        self.write_message(str(int(message)+1))

    def on_close(self):
        print '%d: socket closed' % self.sid

app = web.Application([
    (r'/sox', SocketHandler),
    (r'/(.*)', web.StaticFileHandler, {'path':'.'})
])

if __name__ == '__main__':
    from tornado.ioloop import IOLoop
    app.listen(8000)
    IOLoop.instance().start()
