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
})(["require", "exports", './QueryMethod', 'dojo-core/aspect', 'dojo-core/Evented', 'dojo-core/lang', 'dojo-core/Promise'], function (require, exports) {
    var QueryMethod_1 = require('./QueryMethod');
    var aspect_1 = require('dojo-core/aspect');
    var Evented_1 = require('dojo-core/Evented');
    var lang_1 = require('dojo-core/lang');
    var Promise_1 = require('dojo-core/Promise');
    var hasProto = !!{}.__proto__ && !{}.watch;
    function when(valueOrPromise, callback) {
        var receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";
        if (!receivedPromise) {
            if (arguments.length > 1) {
                return callback ? callback(valueOrPromise) : valueOrPromise;
            }
            else {
                return new Promise_1.default(function (resolve, reject) {
                    resolve(valueOrPromise);
                });
            }
        }
        if (callback) {
            return valueOrPromise.then(callback);
        }
        return valueOrPromise;
    }
    // boodman/crockford delegation w/ cornford optimization
    var TMP = (function () {
        function TMP() {
        }
        return TMP;
    })();
    function delegate(obj, props) {
        TMP.prototype = obj;
        var tmp = new TMP();
        TMP.prototype = null;
        if (props) {
            lang_1.mixin(tmp, props);
        }
        return tmp; // Object
    }
    var Storage = (function (_super) {
        __extends(Storage, _super);
        function Storage() {
            _super.apply(this, arguments);
            this.fullData = [];
            this.version = 0;
        }
        return Storage;
    })(Evented_1.default);
    exports.Storage = Storage;
    var Store = (function () {
        function Store(options) {
            var _this = this;
            this.storage = new Storage();
            // autoEmitEvents: Boolean
            //		Indicates if the events should automatically be fired for put, add, remove
            //		method calls. Stores may wish to explicitly fire events, to control when
            //		and which event is fired.
            this.autoEmitEvents = true;
            // idProperty: String
            //		Indicates the property to use as the identity property. The values of this
            //		property should be unique.
            this.idProperty = 'id';
            // queryAccessors: Boolean
            //		Indicates if client-side query engine filtering should (if the store property is true)
            //		access object properties through the get() function (enabling querying by
            //		computed properties), or if it should (by setting this to false) use direct/raw
            // 		property access (which may more closely follow database querying style).
            this.queryAccessors = true;
            // queryLog: __QueryLogEntry[]
            //		The query operations represented by this collection
            this.queryLog = []; // NOTE: It's ok to define this on the prototype because the array instance is never modified
            this.filter = QueryMethod_1.default({
                type: 'filter',
                normalizeArguments: function (filter) {
                    var Filter = this.Filter;
                    if (filter instanceof Filter) {
                        return [filter];
                    }
                    return [new Filter(filter)];
                }
            });
            this.sort = QueryMethod_1.default({
                type: 'sort',
                normalizeArguments: function (property, descending) {
                    var sorted;
                    if (typeof property === 'function') {
                        sorted = [property];
                    }
                    else {
                        if (property instanceof Array) {
                            sorted = property.slice();
                        }
                        else if (typeof property === 'object') {
                            sorted = [].slice.call(arguments);
                        }
                        else {
                            sorted = [{ property: property, descending: descending }];
                        }
                        sorted = sorted.map(function (sort) {
                            // copy the sort object to avoid mutating the original arguments
                            sort = lang_1.mixin({}, sort);
                            sort.descending = !!sort.descending;
                            return sort;
                        });
                        // wrap in array because sort objects are a single array argument
                        sorted = [sorted];
                    }
                    return sorted;
                }
            });
            this.select = QueryMethod_1.default({
                type: 'select'
            });
            lang_1.mixin(this, options);
            if (this.Model && this.Model.createSubclass) {
                // we need a distinct model for each store, so we can
                // save the reference back to this store on it.
                // we always create a new model to be safe.
                this.Model = this.Model.createSubclass([]).extend({
                    // give a reference back to the store for saving, etc.
                    _store: this
                });
            }
            var store = this;
            if (this.autoEmitEvents) {
                // emit events when modification operations are called
                aspect_1.after(this, 'add', function (originalReturn, originalArgs) {
                    when(originalReturn, function (result) {
                        var event = { target: originalReturn }, options = originalArgs[1] || {};
                        if ('beforeId' in options) {
                            event.beforeId = options.beforeId;
                        }
                        _this.emit('add', event);
                    });
                    return originalReturn;
                });
                aspect_1.after(this, 'put', function (originalReturn, originalArgs) {
                    when(originalReturn, function (result) {
                        var event = { target: originalReturn }, options = originalArgs[1] || {};
                        if ('beforeId' in options) {
                            event.beforeId = options.beforeId;
                        }
                        _this.emit('update', event);
                    });
                    return originalReturn;
                });
                aspect_1.after(this, 'remove', function (result, args) {
                    when(result, function () {
                        store.emit('delete', { id: args[0] });
                    });
                    return result;
                });
            }
        }
        Store.prototype.getIdentity = function (object) {
            // summary:
            //		Returns an object's identity
            // object: Object
            //		The object to get the identity from
            // returns: String|Number
            return object.get ? object.get(this.idProperty) : object[this.idProperty];
        };
        Store.prototype._setIdentity = function (object, identityArg) {
            // summary:
            //		Sets an object's identity
            // description:
            //		This method sets an object's identity and is useful to override to support
            //		multi-key identities and object's whose properties are not stored directly on the object.
            // object: Object
            //		The target object
            // identityArg:
            //		The argument used to set the identity
            if (object.set) {
                object.set(this.idProperty, identityArg);
            }
            else {
                object[this.idProperty] = identityArg;
            }
        };
        Store.prototype.forEach = function (callback, thisObject) {
            var collection = this;
            return when(this.fetch(), function (data) {
                for (var i = 0, item = void 0; (item = data[i]) !== undefined; i++) {
                    callback.call(thisObject, item, i, collection);
                }
                return data;
            });
        };
        Store.prototype.on = function (type, listener) {
            return this.storage.on(type, listener);
        };
        Store.prototype.emit = function (type, event) {
            event = event || {};
            event.type = type;
            try {
                return this.storage.emit(event);
            }
            finally {
                // Return the initial value of event.cancelable because a listener error makes it impossible
                // to know whether the event was actually canceled
                return event.cancelable;
            }
        };
        Store.prototype._restore = function (object, mutateAllowed) {
            // summary:
            //		Restores a plain raw object, making an instance of the store's model.
            //		This is called when an object had been persisted into the underlying
            //		medium, and is now being restored. Typically restored objects will come
            //		through a phase of deserialization (through JSON.parse, DB retrieval, etc.)
            //		in which their __proto__ will be set to Object.prototype. To provide
            //		data model support, the returned object needs to be an instance of the model.
            //		This can be accomplished by setting __proto__ to the model's prototype
            //		or by creating a new instance of the model, and copying the properties to it.
            //		Also, model's can provide their own restore method that will allow for
            //		custom model-defined behavior. However, one should be aware that copying
            //		properties is a slower operation than prototype assignment.
            //		The restore process is designed to be distinct from the create process
            //		so their is a clear delineation between new objects and restored objects.
            // object: Object
            //		The raw object with the properties that need to be defined on the new
            //		model instance
            // mutateAllowed: boolean
            //		This indicates if restore is allowed to mutate the original object
            //		(by setting its __proto__). If this isn't true, than the restore should
            //		copy the object to a new object with the correct type.
            // returns: Object
            //		An instance of the store model, with all the properties that were defined
            //		on object. This may or may not be the same object that was passed in.
            var Model = this.Model;
            if (Model && object) {
                var prototype = Model.prototype;
                var restore = prototype._restore;
                if (restore) {
                    // the prototype provides its own restore method
                    object = restore.call(object, Model, mutateAllowed);
                }
                else if (hasProto && mutateAllowed) {
                    // the fast easy way
                    // http://jsperf.com/setting-the-prototype
                    object.__proto__ = prototype;
                }
                else {
                    // create a new object with the correct prototype
                    object = delegate(prototype, object);
                }
            }
            return object;
        };
        Store.prototype.create = function (properties) {
            // summary:
            //		This creates a new instance from the store's model.
            //	properties:
            //		The properties that are passed to the model constructor to
            //		be copied onto the new instance. Note, that should only be called
            //		when new objects are being created, not when existing objects
            //		are being restored from storage.
            return new this.Model(properties);
        };
        Store.prototype._createSubCollection = function (kwArgs) {
            var newCollection = delegate(this.constructor.prototype);
            for (var i in this) {
                if (this._includePropertyInSubCollection(i, newCollection)) {
                    newCollection[i] = this[i];
                }
            }
            return lang_1.mixin(newCollection, kwArgs);
        };
        Store.prototype._includePropertyInSubCollection = function (name, subCollection) {
            return !(name in subCollection) || subCollection[name] !== this[name];
        };
        Store.prototype._getQuerierFactory = function (type) {
            var uppercaseType = type[0].toUpperCase() + type.substr(1);
            return this['_create' + uppercaseType + 'Querier'];
        };
        return Store;
    })();
    exports.default = Store;
});
