define([
	'dojo/_base/lang',
	'dojo/aspect',
	'dojo/has',
	'dojo/when',
	'dojo/Deferred',
	'dojo/_base/declare',
	'./Model',
	'dojo/Evented'
], function (lang, aspect, has, when, Deferred, declare, Model, Evented) {

	// module:
	//		dstore/Store
	/* jshint proto: true */
	// detect __proto__
	has.add('object-proto', !!{}.__proto__);
	var hasProto = has('object-proto');
	return declare(Evented, {
		constructor: function (options) {
			// perform the mixin
			declare.safeMixin(this, options);
			if (!this.hasOwnProperty('model') && this.model) {
				// we need a distinct model for each store, so we can
				// save the reference back to this store on it
				this.model = declare(Model, {});
			}
			if(this.model){
				// give a reference back to the store for saving, etc.
				this.model.prototype._store = this;
			}
		},

		// idProperty: String
		//		Indicates the property to use as the identity property. The values of this
		//		property should be unique.
		idProperty: 'id',

		getIdentity: function (object) {
			// summary:
			//		Returns an object's identity
			// object: Object
			//		The object to get the identity from
			// returns: Number
			return object[this.idProperty];
		},

		map: function (callback, thisObject) {
			var results = [];
			// like forEach, except we collect results
			return when(this.forEach(function (object, i) {
				results.push(callback.call(thisObject, object, i));
			}, thisObject), function () {
				return results;
			});
		},
		forEach: function (callback, thisObject) {
			return when(this.fetch(), function (data) {
				for (var i = 0, l = data.length; i < l; i++) {
					callback.call(thisObject, data[i], i);
				}
				return data;
			});
		},
		on: function (type, listener) {
			//	summary:
			//		Listen for data changes
			if (type !== 'refresh' && this.store && this.store !== this) {
				return this.store.on(type, listener);
			}
			return this.inherited(arguments);
		},
		emit: function (type, event) {
			event = event || {};
			event.type = type;
			return this.inherited(arguments);
		},

		// parse: Function
		//		One can provide a parsing function that will permit the parsing of the data. By
		//		default we assume the provide data is a simple JavaScript array that requires
		//		no parsing
		parse: null,

		// model: Function
		//		This should be a entity (like a class/constructor) with a 'prototype' property that will be
		//		used as the prototype for all objects returned from this store. One can set this
		//		to null if you don't want any methods to decorate the returned
		//		objects (this can improve performance by avoiding prototype setting)
		model: Model,

		// excludePropertiesOnCopy: Object
		//		This contains a hash of objects that should be excluded when properties are copied to new
		//		sub collections.
		excludePropertiesOnCopy: {
			data: true,
			index: true,
			total: true
		},

		_restore: function (object) {
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
			// returns: Object
			//		An instance of the store model, with all the properties that were defined
			//		on object. This may or may not be the same object that was passed in.
			var model = this.model;
			if (model && object) {
				var prototype = model.prototype;
				var restore = prototype._restore;
				if (restore) {
					// the prototype provides its own restore method
					object = restore.call(object, model);
				} else if (hasProto) {
					// the fast easy way
					// http://jsperf.com/setting-the-prototype
					object.__proto__ = prototype;
				} else {
					// create a new object with the correct prototype
					object = lang.delegate(prototype, object);
				}
			}
			return object;
		},

		create: function (properties) {
			// summary:
			//		This creates a new instance from the store's model.
			//	properties:
			//		The properties that are passed to the model constructor to
			//		be copied onto the new instance. Note, that should only be called
			//		when new objects are being created, not when existing objects
			//		are being restored from storage.
			return new this.model(properties);
		},

		_createSubCollection: function (kwArgs) {
			var store = this.store || this,
				excluded = this.excludePropertiesOnCopy,
				newCollection = lang.delegate(store.constructor.prototype, lang.mixin({ store: store }));

			for (var i in this) {
				if (this.hasOwnProperty(i) && !excluded.hasOwnProperty(i)) {
					newCollection[i] = this[i];
				}
			}

			return lang.mixin(newCollection, kwArgs);
		},

		filter: function (filter) {
			return this._createSubCollection({
				filtered: (this.filtered || []).concat(filter)
			});
		},

		sort: function (property, descending) {
			var sorted;

			if (typeof property === 'function') {
				sorted = property;
			} else if (lang.isArray(property)) {
				sorted = property.slice(0);
			} else if (typeof property === 'object') {
				sorted = [].slice.call(arguments, 0);
			} else {
				sorted = [{
					property: property,
					descending: !!descending
				}];
			}

			return this._createSubCollection({ sorted: sorted });
		},

		range: function (start, end) {
			if (this.ranged) {
				var base = this.ranged.start,
					cap = this.ranged.end;
				// TODO: Should we quietly cap start and end? Should we warn or throw an error instead?
				if (isFinite(cap)) {
					start = Math.min(base + start, cap);
					end = isFinite(end) ? Math.min(base + end, cap) : cap;
				} else {
					start = base + start;
					end = isFinite(end) ? base + end : undefined;
				}
			}

			return this._createSubCollection({
				ranged: { start: start, end: end }
			});
		}
	});
});
