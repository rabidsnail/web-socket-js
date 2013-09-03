define(["load_swf"], function(swf) {

    var socket = {};
    var swf_location = '/WebSocketMainInsecure.swf';

    var random_global = function() {
        while (true) {
            var name = swf.random_string(10);
            if (!(name in window)) {
                return name;
            }
        }
    };

    if (window.WebSocket) {
        socket.connect = function(url) {
            var ws;
            var message_callbacks = [];
            var send_buffer = [];
            var closed = false;
            var open = false;
            var init;
            init = function() {
                ws = new WebSocket(url);
                ws.onopen = function() {
                    open = true;
                    while(send_buffer.length > 0) {
                        ws.send(send_buffer.shift());
                    }
                };
                ws.onmessage = function(evt) {
                    var data = evt.data;
                    for (var i=0; i < message_callbacks.length; i++) {
                        var cb = message_callbacks[i];
                        if (cb) {
                            cb(data);
                        }
                    }
                };
                ws.onclose = function() {
                    open = false;
                    if (!closed) {
                        init();
                    }
                };
            };
            return {
                send: function(data) {
                    if (closed) return false;
                    if (open) {
                        ws.send(data);
                    } else {
                        send_buffer.push(data);
                    }
                },
                onMessage: function(fn) {
                    var i = message_callbacks.length;
                    message_callbacks.push(fn);
                    return i;
                },
                removeCallback: function(idx) {
                    message_callbacks[idx] = null;
                },
                close: function() {
                    closed = true;
                    ws.close();
                }
            };
        };
    } else {
        var global = random_global();
        var socket_swf = null;
        var swf_callbacks = [];
        window[global] = function(evt) {
            swf_callbacks[evt.webSocketId](evt);
        };

        var onSwf = function(fn) {
            if (socket_swf) {
                fn(socket_swf);
            } else {
                swf_callbacks.push(fn);
            }
        }

        swf.onReady(function() {
            socket_swf = swf.create(swf_location, {}, {
                hasPriority: true,
                swliveconnect: true,
                allowScriptAccess: 'always',
                flashVars: 'callbackName=window.'+global
            });
            while(swf_callbacks.length > 0) {
                swf_callbacks.pop()(socket_swf);
            }
        });

        soket.connect = function(url) {

            var callback_idx = swf_callbacks.length;
            var message_callbacks = [];
            var send_buffer = [];
            var closed = false;
            var open = false;

            var connect = function() {
                onSwf(function(swf) {
                    swf.create(callback_idx, url, []);
                });
            };

            swf_callbacks.push(function(evt) {
                switch(evt.type) {
                    case 'message':
                        var msg = decodeURIComponent(evt.message);
                        for (var i=0; i < message_callbacks.length; i++) {
                            var c = message_callbacks[i];
                            if (c) c(msg);
                        }
                        break;
                    case 'close':
                        if (!closed) connect();
                        break;
                    case 'open':
                        open = true;
                        while (send_buffer.length > 0) {
                            socket_swf.send(callback_idx, send_buffer.shift());
                        }
                        break;
                }
            });

            connect();
            
            return {
                send: function(data) {
                    if (closed) return false;
                    if (open) {
                        socket_swf.send(callback_idx, data);
                    } else {
                        send_buffer.push(data);
                    }
                },
                onMessage: function(fn) {
                    var i = message_callbacks.length;
                    message_callbacks.push(fn);
                    return i;
                },
                removeCallback: function(idx) {
                    message_callbacks[idx] = null;
                },
                close: function() {
                    if (open) {
                        closed = true;
                        socket_swf.close(callback_idx);
                    }
                }
            };

        };

    }

    return socket;

});
