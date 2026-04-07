// ============================================================
// BUS — Lightweight pub/sub event bus (window.Bus)
//
// Usage:
//   Bus.on('articles:saved', handler)
//   Bus.emit('articles:saved', { id: '123' })
//   Bus.off('articles:saved', handler)
// ============================================================

(function () {
    'use strict';

    const _handlers = {};

    const Bus = {
        /**
         * Subscribe to an event.
         * @param {string} event
         * @param {Function} handler
         */
        on(event, handler) {
            if (!_handlers[event]) _handlers[event] = [];
            if (!_handlers[event].includes(handler)) {
                _handlers[event].push(handler);
            }
            return Bus; // Chainable
        },

        /**
         * Unsubscribe a handler from an event.
         * @param {string} event
         * @param {Function} handler
         */
        off(event, handler) {
            if (!_handlers[event]) return Bus;
            _handlers[event] = _handlers[event].filter(h => h !== handler);
            return Bus;
        },

        /**
         * Emit an event with optional data payload.
         * @param {string} event
         * @param {*} data
         */
        emit(event, data) {
            if (!_handlers[event]) return Bus;
            _handlers[event].forEach(h => {
                try { h(data); }
                catch (e) { console.error(`[Bus] Handler error on "${event}":`, e); }
            });
            return Bus;
        },

        /**
         * Subscribe to an event only once.
         * @param {string} event
         * @param {Function} handler
         */
        once(event, handler) {
            const wrapper = (data) => {
                handler(data);
                Bus.off(event, wrapper);
            };
            return Bus.on(event, wrapper);
        }
    };

    // Expose globally
    window.Bus = Bus;

})();
