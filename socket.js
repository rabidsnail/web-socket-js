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

    var retry_fn = function(fn) {
        var interval = 50;
        return function() {
            setTimeout(fn, interval);
            if (interval < 1000) {
                interval *= 2;
            }
        };
    };

    var future = function() {
        var callbacks = [];
        return {
            add: function(fn) {
                var idx = callbacks.length;
                callbacks.push(fn);
                return idx;
            },
            remove: function(idx) {
                callbacks[idx] = null;
            },
            fire: function() {
                for (var i=0; i < callbacks.length; i++) {
                    var cb = callbacks[i];
                    if (cb) cb.apply(cb, arguments);
                }
            }
        };
    };

    if (window.WebSocket) {
        socket.connect = function(url) {
            var ws;
            var message_callbacks = future();
            var open_callbacks = future();
            var send_buffer = [];
            var closed = false;
            var open = false;
            var init;
            var retry;

            init = function() {
                ws = new WebSocket(url);
                ws.onopen = function() {
                    open = true;
                    while(send_buffer.length > 0 && ws.readyState === 1) {
                        ws.send(send_buffer.shift());
                    }
                    open_callbacks.fire();
                };
                ws.onerror = function(evt) {
                    retry();
                };
                ws.onmessage = function(evt) {
                    message_callbacks.fire(evt.data);
                };
                ws.onclose = function() {
                    open = false;
                    if (!closed) {
                        retry();
                    }
                };
            };
            retry = retry_fn(init);
            init();
            return {
                send: function(data) {
                    if (closed) return false;
                    if (open && ws.readyState === 1) {
                        ws.send(data);
                    } else {
                        send_buffer.push(data);
                    }
                },
                onOpen: open_callbacks.add,
                removeOpenCallback: open_callbacks.remove,
                onMessage: message_callbacks.add,
                removeMessageCallback: message_callbacks.remove,
                close: function() {
                    closed = true;
                    ws.close();
                }
            };

        };
    } else {
        var global = random_global();
        var socket_swf = null;
        var swf_loaded = false;
        var swf_callbacks = [];
        window[global] = function(evt) {
            if (evt == 'load') {
                swf_loaded = true;
                while(swf_callbacks.length > 0) {
                    swf_callbacks.shift()(socket_swf);
                }
            } else {
                swf_callbacks[evt.webSocketId](evt);
            }
        };

        var onSwf = function(fn) {
            if (swf_loaded) {
                fn(socket_swf);
            } else {
                swf_callbacks.push(fn);
            }
        };

        swf.onReady(function() {
            socket_swf = swf.create(swf_location, {}, {
                hasPriority: true,
                swliveconnect: true,
                allowScriptAccess: 'always',
                flashVars: 'callbackName=window.'+global
            });
        });

        soket.connect = function(url) {

            var callback_idx = swf_callbacks.length;
            var message_callbacks = future();
            var open_callbacks = future();
            var send_buffer = [];
            var closed = false;
            var open = false;

            var connect = function() {
                onSwf(function(swf) {
                    swf.create(callback_idx, url, []);
                });
            };

            var reconnect = retry_fn(connect);

            swf_callbacks.push(function(evt) {
                switch(evt.type) {
                    case 'message':
                        var msg = decodeURIComponent(evt.message);
                        message_callbacks.fire(msg);
                        break;
                    case 'close':
                        if (!closed) reconnect();
                        break;
                    case 'open':
                        open = true;
                        while (send_buffer.length > 0) {
                            socket_swf.send(callback_idx, send_buffer.shift());
                        }
                        open_callbacks.fire();
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
                onOpen: open_callbacks.add,
                removeOpenCallback: open_callbacks.remove,
                onMessage: message_callbacks.add,
                removeMessageCallback: message_callbacks.remove,
                close: function() {
                    closed = true;
                    if (open) {
                        socket_swf.close(callback_idx);
                    }
                }
            };

        };

    }

    return socket;

});
