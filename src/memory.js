var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", './promised', './query-results', './simple-query-store'], function (require, exports) {
    var promised = require('./promised');
    var query_results_1 = require('./query-results');
    var simple_query_store_1 = require('./simple-query-store');
    var Memory = (function (_super) {
        __extends(Memory, _super);
        function Memory() {
            _super.call(this);
            this.autoEmitEvents = false; // this is handled by the methods themselves
            this.get = promised.get;
            this.put = promised.put;
            this.add = promised.add;
            this.remove = promised.remove;
            this.fetch = promised.fetch;
            this.fetchRange = promised.fetchRange;
            this.defaultNewToStart = false;
            // Add a version property so subcollections can detect when they're using stale data
            this.storage.version = 0;
        }
        Memory.prototype.set_data = function (data) {
            // summary:
            //		Sets the given data as the source for this store, and indexes it
            // data: Object[]
            //		An array of objects to use as the source of data. Note that this
            //		array will not be copied, it is used directly and mutated as
            //		data changes.
            if (this.parse) {
                data = this.parse(data);
            }
            if (data.items) {
                // just for convenience with the data format ItemFileReadStore expects
                this.idProperty = data.identifier || this.idProperty;
                data = data.items;
            }
            var storage = this.storage;
            storage.fullData = this._data = data;
            this._reindex();
            // this._data = data;
        };
        Object.defineProperty(Memory.prototype, "data", {
            get: function () {
                return this._data || (this._data = []);
            },
            enumerable: true,
            configurable: true
        });
        Memory.prototype.getSync = function (id) {
            // summary:
            //		Retrieves an object by its identity
            // id: Number
            //		The identity to use to lookup the object
            // returns: Object
            //		The object in the store that matches the given id.
            return this.storage.fullData[this.storage.index[id]];
        };
        Memory.prototype.putSync = function (object, options) {
            // summary:
            //		Stores an object
            // object: Object
            //		The object to store.
            // options: dstore/Store.PutDirectives?
            //		Additional metadata for storing the data.  Includes an 'id'
            //		property if a specific id is to be used.
            // returns: Number
            options = options || {};
            var storage = this.storage, index = storage.index, data = storage.fullData;
            var Model = this.Model;
            if (Model && !(object instanceof Model)) {
                // if it is not the correct type, restore a
                // properly typed version of the object. Note that we do not allow
                // mutation here
                object = this._restore(object);
            }
            var id = this.getIdentity(object);
            if (id == null) {
                this._setIdentity(object, ('id' in options) ? options.id : Math.random());
                id = this.getIdentity(object);
            }
            storage.version++;
            var eventType = id in index ? 'update' : 'add', event = { target: object }, previousIndex, defaultDestination;
            if (eventType === 'update') {
                if (options.overwrite === false) {
                    throw new Error('Object already exists');
                }
                else {
                    data.splice(previousIndex = index[id], 1);
                    defaultDestination = previousIndex;
                }
            }
            else {
                defaultDestination = this.defaultNewToStart ? 0 : data.length;
            }
            var destination;
            if ('beforeId' in options) {
                var beforeId = options.beforeId;
                if (beforeId === null) {
                    destination = data.length;
                }
                else {
                    destination = index[beforeId];
                    // Account for the removed item
                    if (previousIndex < destination) {
                        --destination;
                    }
                }
                if (destination !== undefined) {
                    event.beforeId = beforeId;
                }
                else {
                    console.error('options.beforeId was specified but no corresponding index was found');
                    destination = defaultDestination;
                }
            }
            else {
                destination = defaultDestination;
            }
            data.splice(destination, 0, object);
            // the fullData has been changed, so the index needs updated
            var i = isFinite(previousIndex) ? Math.min(previousIndex, destination) : destination;
            for (var l = data.length; i < l; ++i) {
                index[this.getIdentity(data[i])] = i;
            }
            this.emit(eventType, event);
            return object;
        };
        Memory.prototype.addSync = function (object, options) {
            // summary:
            //		Creates an object, throws an error if the object already exists
            // object: Object
            //		The object to store.
            // options: dstore/Store.PutDirectives?
            //		Additional metadata for storing the data.  Includes an 'id'
            //		property if a specific id is to be used.
            // returns: Number
            (options = options || {}).overwrite = false;
            // call put with overwrite being false
            return this.putSync(object, options);
        };
        Memory.prototype.removeSync = function (id) {
            // summary:
            //		Deletes an object by its identity
            // id: Number
            //		The identity to use to delete the object
            // returns: Boolean
            //		Returns true if an object was removed, falsy (undefined) if no object matched the id
            var storage = this.storage;
            var index = storage.index;
            var data = storage.fullData;
            if (id in index) {
                var removed = data.splice(index[id], 1)[0];
                // now we have to reindex
                this._reindex();
                this.emit('delete', { id: id, target: removed });
                return true;
            }
        };
        Memory.prototype._reindex = function () {
            var storage = this.storage;
            var index = storage.index = {};
            var data = storage.fullData;
            var Model = this.Model;
            var ObjectPrototype = Object.prototype;
            for (var i = 0, l = data.length; i < l; i++) {
                var object = data[i];
                if (Model && !(object instanceof Model)) {
                    var restoredObject = this._restore(object, 
                    // only allow mutation if it is a plain object
                    // (which is generally the expected input),
                    // if "typed" objects are actually passed in, we will
                    // respect that, and leave the original alone
                    object.__proto__ === ObjectPrototype);
                    if (object !== restoredObject) {
                        // a new object was generated in the restoration process,
                        // so we have to update the item in the data array.
                        data[i] = object = restoredObject;
                    }
                }
                index[this.getIdentity(object)] = i;
            }
            storage.version++;
        };
        Memory.prototype.fetchSync = function () {
            var data = this.data;
            if (!data || data._version !== this.storage.version) {
                // our data is absent or out-of-date, so we requery from the root
                // start with the root data
                data = this.storage.fullData;
                var queryLog = this.queryLog;
                // iterate through the query log, applying each querier
                for (var i = 0, l = queryLog.length; i < l; i++) {
                    data = queryLog[i].querier(data);
                }
                // store it, with the storage version stamp
                data._version = this.storage.version;
                this.data = data;
            }
            return query_results_1.default(data);
        };
        Memory.prototype.fetchRangeSync = function (kwArgs) {
            var data = this.fetchSync(), start = kwArgs.start, end = kwArgs.end;
            return query_results_1.default(data.slice(start, end), {
                totalLength: data.length
            });
        };
        Memory.prototype._includePropertyInSubCollection = function (name) {
            return name !== 'data' && _super.prototype._includePropertyInSubCollection.call(this, name);
        };
        return Memory;
    })(simple_query_store_1.default);
    exports.default = Memory;
});
