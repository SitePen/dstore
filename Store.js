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
	return /*==== Store= ====*/declare(Evented, /*==== [Collection] ====*/{
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
			// returns: String|Number
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
/*====,
		get: function (id) {
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
		},
		put: function (object, directives) {
			// summary:
			//		Stores an object
			// object: Object
			//		The object to store.
			// directives: dstore/Store.PutDirectives?
			//		Additional directives for storing objects.
			// returns: Number|String
		},
		add: function (object, directives) {
			// summary:
			//		Creates an object, throws an error if the object already exists
			// object: Object
			//		The object to store.
			// directives: dstore/Store.PutDirectives?
			//		Additional directives for creating objects.
			// returns: Number|String
		},
		remove: function (id) {
			// summary:
			//		Deletes an object by its identity
			// id: Number
			//		The identity to use to delete the object
		},
		transaction: function () {
			// summary:
			//		Starts a new transaction.
			//		Note that a store user might not call transaction() prior to using put,
			//		delete, etc. in which case these operations effectively could be thought of
			//		as "auto-commit" style actions.
			// returns: dstore/Store.Transaction
			//		This represents the new current transaction.
		},
		getChildren: function (parent) {
			// summary:
			//		Retrieves the children of an object.
			// parent: Object
			//		The object to find the children of.
			// returns: dstore/Store.Collection
			//		A result set of the children of the parent object.
		}
====*/
	});
});


/*====
	var Collection = declare(null, {
		// summary:
		//		This is an abstract API that for a collection of items, which can be filtered,
		//		sorted, and sliced to create new collections
		//		Every method and property is optional, and is only needed if the functionality
		//		it provides is required.
		//		Every method may return a promise for the specified return value if the
		//		execution of the operation is asynchronous (except
		//		for query() which already defines an async return value).
		//		Note that the objects in the collection may not be immediately retrieved from
		//		the underlying data storage until they are actually accessed through forEach() or then().

		filter: function (query) {
			// summary:
			//		Filters the collection, returning a new subset collection
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// returns: Collection
		},
		sort: function (property, descending) {
			// summary:
			//		Sorts the current collection, reordering the objects by the provided sort order.
			// property: String|Function
			//		The property to sort on. Alternately a function can be provided to sort with
			// descending?: Boolean
			//		Indicate if the sort order should be descending (defaults to ascending)
			// returns: Collection
		},
		range: function (start, end) {
			// summary:
			//		Retrieves a range of objects from the collection, returning a new collection with the objects indicated by the range
			// start: Number
			//		The starting index of objects to return (0-indexed)
			// end?: Number
			//		The exclusive end of objects to return
			// returns: Collection
		},
		forEach: function (callback, thisObject) {
			// summary:
			//		Iterates over the query results, based on
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach.
			//		Note that this may executed asynchronously. The callback may be called
			//		after this function returns.
			// callback:
			//		Function that is called for each object in the query results
			// thisObject:
			//		The object to use as |this| in the callback.
		},
		map: function (callback, thisObject) {
			// summary:
			//		Maps the query results, based on
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map.
			//		Note that this may executed asynchronously. The callback may be called
			//		after this function returns.
			// callback:
			//		Function that is called for each object in the query results
			// thisObject:
			//		The object to use as |this| in the callback.
			// returns: dstore/Store.Collection
		},
		then: function (callback, errorHandler) {
			// summary:
			//		This registers a callback for when the query is complete, if the query is asynchronous.
			//		This is an optional method, and may not be present for synchronous queries.
			// callback:
			//		This is called when the query is completed successfully, and is passed a single argument
			//		that is an array representing the query results.
			// errorHandler:
			//		This is called if the query failed, and is passed a single argument that is the error
			//		for the failure.
		},
		on: function (type, listener) {
			// summary:
			//		This registers a callback for notification of when data is modified in the query results.
			// type: String
			//		There are four types of events defined in this API:
			//		- add - A new object was added
			//		- update - An object was updated
			//		- remove - An object was deleted
			//		- refresh - The entire collection has been changed, and the listener should reiterate over the results
			// listener: Function
			//		The listener function is called when objects in the query results are modified
			//		to affect the query result. The listener function is called with a single event object argument:
			//		| listener(event);
			//
			//		- The event object as the following properties:
			//		- type - The event type (of the four above)
			//		- data - This indicates the object that was create or modified.
			//		- id - If an object was removed, this indicates the object that was removed.
			//		The next two properties will only be available if array tracking is employed,
			//		which is usually provided by dstore/Observable
			//		- previousIndex - The previousIndex parameter indicates the index in the result array where
			//		the object used to be. If the value is -1, then the object is an addition to
			//		this result set (due to a new object being created, or changed such that it
			//		is a part of the result set).
			//		- index - The inex parameter indicates the index in the result array where
			//		the object should be now. If the value is -1, then the object is a removal
			//		from this result set (due to an object being deleted, or changed such that it
			//		is not a part of the result set).

		},

		// total: Number|Promise?
		//		This property should be included in if the query options included the 'count'
		//		property limiting the result set. This property indicates the total number of objects
		//		matching the query (as if "start" and "count" weren't present). This may be
		//		a promise if the query is asynchronous.
		total: 0,
		// sorted: Collection.SortInformation[]|Function
		//		If the collection has been sorted, this is an array of sort objects or a comparator function.
		//		If sorted by one or more properties, `sorted` is an array of objects where each contains a property name
		//		and an optional flag indicating whether it should be sorted descending. If sorted using a custom
		//		comparator, `sorted` is the comparator function.
		sorted: [],
		// filtered: String|Object|Function|Array
		//		If the collection has been filtered, this is an object that indicates the query that
		//		was used to filter it.
		filtered: {},
		// ranged: Object
		//		If the collection has been subsetted with range, this is an object that indicates the start
		//		and end of the range
		ranged: {}
	});

	Collection.SortInformation = declare(null, {
		// summary:
		//		An object describing what property to sort on, and the direction of the sort.
		// property: String
		//		The name of the property to sort on.
		// descending: Boolean
		//		The direction of the sort.  Default is false.
	});
	Store.Collection = Collection;

	Store.PutDirectives = declare(null, {
		// summary:
		//		Directives passed to put() and add() handlers for guiding the update and
		//		creation of stored objects.
		// id: String|Number?
		//		Indicates the identity of the object if a new object is created
		// before: Object?
		//		If the collection of objects in the store has a natural ordering,
		//		this indicates that the created or updated object should be placed before the
		//		object specified by the value of this property. A value of null indicates that the
		//		object should be last.
		// parent: Object?,
		//		If the store is hierarchical (with single parenting) this property indicates the
		//		new parent of the created or updated object.
		// overwrite: Boolean?
		//		If this is provided as a boolean it indicates that the object should or should not
		//		overwrite an existing object. A value of true indicates that a new object
		//		should not be created, the operation should update an existing object. A
		//		value of false indicates that an existing object should not be updated, a new
		//		object should be created (which is the same as an add() operation). When
		//		this property is not provided, either an update or creation is acceptable.
	});

	Store.Transaction = declare(null, {
		// summary:
		//		This is an object returned from transaction() calls that represents the current
		//		transaction.

		commit: function () {
			// summary:
			//		Commits the transaction. This may throw an error if it fails. Of if the operation
			//		is asynchronous, it may return a promise that represents the eventual success
			//		or failure of the commit.
		},
		abort: function (callback, thisObject) {
			// summary:
			//		Aborts the transaction. This may throw an error if it fails. Of if the operation
			//		is asynchronous, it may return a promise that represents the eventual success
			//		or failure of the abort.
		}
	});
====*/