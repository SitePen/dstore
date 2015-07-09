import * as arrayUtil from 'dojo-core/array';
import * as aspect from 'dojo-core/aspect';
import Evented from 'dojo-core/Evented';
import { default as has, add } from 'dojo-core/has';
import { EventObject, Handle } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import Filter from './Filter';
import * as dstore from './interfaces';
import QueryMethod, { QueryMethodArgs } from './QueryMethod';

// module:
//		dstore/Store
/* jshint proto: true */
// detect __proto__, and avoid using it on Firefox, as they warn about
// deoptimizations. The watch method is a clear indicator of the Firefox
// JS engine.

add('object-proto', Boolean((<any>{})['__proto__']) && !(<any>{}).watch);
var hasProto = has('object-proto');

export interface NewableStoreModel {
	new (args?: {}): any;
	createSubclass: (arg: any[]) => any;
	prototype: any;
}

export interface StoreArgs {
	Model?: NewableStoreModel;
}

export default class Store extends Evented {
	[index: string]: any;

	// summary:
	//		Creates an object, throws an error if the object already exists
	// object: Object
	//		The object to store.
	// directives: dstore/Store.PutDirectives?
	//		Additional directives for creating objects.
	// returns: Object
	//		The object that was stored, with any changes that were made by
	//		the storage system (like generated id)
	add: (object: any, directives?: dstore.PutDirectives) => any;

	// autoEmitEvents: Boolean
	//		Indicates if the events should automatically be fired for put, add, remove
	//		method calls. Stores may wish to explicitly fire events, to control when
	//		and which event is fired.
	autoEmitEvents: boolean;

	// autoEmitHandles: Handle[]
	//		Holdes handles to the aspects responsible for automatically emitting events
	//		when add, remove, or put are called.
	// TODO - Once all classes are converted to typescript, and overriding value for autoEmitEvents
	// can be passed to the constructor, and this will no longer be necessary.
	autoEmitHandles: Handle[];

	fetch: () => Promise<any>;

	Filter: typeof Filter;

	// summary:
	//		Retrieves an object by its identity
	// id: Number
	//		The identity to use to lookup the object
	// returns: Object
	//		The object in the store that matches the given id.
	get: (id: string | number) => any;

	// idProperty: String
	//		Indicates the property to use as the identity property. The values of this
	//		property should be unique.
	idProperty: string;

	// Model: Function
	//		This should be a entity (like a class/constructor) with a 'prototype' property that will be
	//		used as the prototype for all objects returned from this store. One can set
	//		this to the Model from dmodel/Model to return Model objects, or leave this
	//		to null if you don't want any methods to decorate the returned
	//		objects (this can improve performance by avoiding prototype setting),
	Model: NewableStoreModel;

	// parse: Function
	//		One can provide a parsing function that will permit the parsing of the data. By
	//		default we assume the provide data is a simple JavaScript array that requires
	//		no parsing (subclass stores may provide their own default parse function)
	parse: () => any;

	// summary:
	//		Stores an object
	// object: Object
	//		The object to store.
	// directives: dstore/Store.PutDirectives?
	//		Additional directives for storing objects.
	// returns: Object
	//		The object that was stored, with any changes that were made by
	//		the storage system (like generated id)
	put: (object: any, directives?: dstore.PutDirectives) => any;

	// queryAccessors: Boolean
	//		Indicates if client-side query engine filtering should (if the store property is true)
	//		access object properties through the get() function (enabling querying by
	//		computed properties), or if it should (by setting this to false) use direct/raw
	// 		property access (which may more closely follow database querying style).
	queryAccessors: boolean =  true;

	// summary:
	//		Deletes an object by its identity
	// id: Number
	//		The identity to use to delete the object
	remove: (id: string | number) => void;

	// queryLog: __QueryLogEntry[]
	//		The query operations represented by this collection
	queryLog: dstore.QueryLogEntry<any>[];

	storage: Evented;

	// stringify: Function
	//		For stores that serialize data (to send to a server, for example) the stringify
	//		function can be specified to control how objects are serialized to strings
	stringify: () => any;

	constructor(options?: StoreArgs) {
		super();
		this.autoEmitEvents = true;
		this.autoEmitHandles = [];
		this.idProperty = 'id';
		this.queryLog = [];
		this.Filter = Filter;
		// Set defaults
		// perform the mixin
		options && lang.mixin(this, options);
		// TODO - Don't do this, it's a workaround to make inheritance from this class via
		// declare work properly.
		for (let name in this) {
			let value = this[name];
			if (Object.prototype.toString.call(value) === '[object Function]') {
				value.nom = name;
			}
		}

		// TODO - This is designed specifically for working with declare-based inheritance and needs to be reworked.
		if (this.Model && this.Model.createSubclass) {
			// we need a distinct model for each store, so we can
			// save the reference back to this store on it.
			// we always create a new model to be safe.
			this.Model = this.Model.createSubclass([]).extend({
				// give a reference back to the store for saving, etc.
				_store: this
			});
		}

		// the object the store can use for holding any local data or events
		this.storage = new Evented();
		var store = this;
		if (this.autoEmitEvents) {
			// emit events when modification operations are called
			this.autoEmitHandles.push(aspect.after(this, 'add', <any>this._emitUpdateEvent('add')));
			this.autoEmitHandles.push(aspect.after(this, 'put', <any>this._emitUpdateEvent('update')));
			this.autoEmitHandles.push(aspect.after(this, 'remove', function (result, args) {
				const emit = function (result: Promise<any> | any) {
					store._emit('delete', {
						id: args[0],
						type: undefined
					});

					return result;
				};

				if (result && result.then) {
					result.then(emit);
					return result;
				}

				return emit(result);
			}));
		}
	}

	private _emit(type: string, event: {type: string, cancelable?: boolean}): void | boolean {
		event = event || {
			type: undefined
		};
		event.type = type;
		try {
			return this.storage.emit(event);
		} finally {
			// Return the initial value of event.cancelable because a listener error makes it impossible
			// to know whether the event was actually canceled
			return event['cancelable'];
		}
	}

	protected _emitUpdateEvent(type: string) {
		return function (result: Promise<any> | any, args: {beforeId: string | number}[]) {
			var self = this;
			const emit = function (result: Promise<any> | any) {
				var event: { [ index: string ]: any } = {
					target: result
				};
				var	options = args[ 1 ] || <any>{};
				if ('beforeId' in options) {
					event['beforeId'] = options.beforeId;
				}
				self._emit(type, event);
				return result;
			};

			if (result && result.then) {
				result.then(emit);
				return result;
			}
			else {
				return emit(result);
			}
		};
	}

	protected _createSubCollection(kwArgs: {}) {
		let newCollection = <{ [ index: string ]: any }> (<any>Object).setPrototypeOf({}, this.constructor);

		for (let i in this) {
			if (this._includePropertyInSubCollection(i, newCollection)) {
				newCollection[i] = this[i];
			}
		}

		return lang.mixin(newCollection, kwArgs);
	}

	protected _getQuerierFactory(type: string) {
		var uppercaseType = type[0].toUpperCase() + type.substr(1);
		return this['_create' + uppercaseType + 'Querier'];
	}

	protected _includePropertyInSubCollection(name: string, subCollection: { [ index: string ]: any }) {
		return !(name in subCollection) || subCollection[name] !== this[name];
	}

	protected _restore(object: { [ index: string ]: any }, mutateAllowed: boolean) {
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
			} else if (hasProto && mutateAllowed) {
				// the fast easy way
				// http://jsperf.com/setting-the-prototype
				object['__proto__'] = prototype;
			} else {
				// create a new object with the correct prototype
				object = <{ [ index: string]: any }>lang.create(prototype, object, Model);
			}
		}
		return object;
	}

	protected _setIdentity(object:{ [index: string]: any; set: any}, identityArg: any) {
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
		} else {
			object[ this.idProperty ] = identityArg;
		}
	}

	create(properties: {}) {
		// summary:
		//		This creates a new instance from the store's model.
		//	properties:
		//		The properties that are passed to the model constructor to
		//		be copied onto the new instance. Note, that should only be called
		//		when new objects are being created, not when existing objects
		//		are being restored from storage.
		return  new this.Model(properties);
	}

	filter<T>(...args: any[]): dstore.Collection<T> {
		return QueryMethod(<QueryMethodArgs<T>>{
			type: 'filter',
			normalizeArguments: function (filter) {
				var Filter = this.Filter;
				if (filter instanceof Filter) {
					return [ filter ];
				}
				return [ new Filter(filter) ];
			}
		}).apply(this, args);
	}

	forEach<T>(callback: (item: T, index: number | string, collection: T[]) => void, thisObject?: any) {
		// summary:
		//		Iterates over the query results, based on
		//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach.
		//		Note that this executes asynchronously, and returns a promise to indicate when the
		//		callback has been executed.
		// callback:
		//		Function that is called for each object in the query results
		// thisObject:
		//		The object to use as |this| in the callback.
		// returns:
		//		Promise
		return this.fetch().then((data: T[]) => {
			let i: number;
			let item: any;
			for (i = 0; (item = data[i]) !== undefined; i++) {
				callback.call(thisObject, item, i, this);
			}
			return data;
		});
	}

	getIdentity(object: { [index: string]: any, get?: any}) {
		// summary:
		//		Returns an object's identity
		// object: Object
		//		The object to get the identity from
		// returns: String|Number
		return object.get ? object.get(this.idProperty) : object[ this.idProperty ];
	}

	emit(event: EventObject) {
		return this._emit(event.type, {
			type: event.type,
			cancelable: undefined
		});
	}

	on(type: string, listener: (event: { type: string, beforeId: string | number }) => void) {
		return this.storage.on(type, listener);
	}

	select<T>(...args: any[]) : dstore.Collection<T> {
		return QueryMethod(<QueryMethodArgs<T>>{
			type: 'select'
		}).apply(this, args);
	}

	sort<T>(...args: any[]): dstore.Collection<T> {
		return QueryMethod(<QueryMethodArgs<T>>{
			type: 'sort',
			normalizeArguments: function (property, descending) {
				let sorted: any[];
				if (typeof property === 'function') {
					sorted = [ property ];
				}
				else {
					if (property instanceof Array) {
						sorted = property.slice();
					}
					else if (typeof property === 'object') {
						sorted = [].slice.call(arguments);
					}
					else {
						sorted = [ { property: property, descending: descending } ];
					}

					sorted = sorted.map(function (sort: { descending: boolean }) {
						// copy the sort object to avoid mutating the original arguments
						sort = <{ descending: boolean }>lang.mixin({}, sort);
						sort.descending = !!sort.descending;
						return sort;
					});
					// wrap in array because sort objects are a single array argument
					sorted = [ sorted ];
				}
				return sorted;
			}
		}).apply(this, args);
	}
/*====,
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
}
/*====
	var Collection = declare(null, {
		// summary:
		//		This is an abstract API for a collection of objects, which can be filtered,
		//		sorted, and sliced to create new collections. This is considered to be base
		//		interface for all stores and  query results in dstore. Note that the objects in the
		//		collection may not be immediately retrieved from the underlying data
		//		storage until they are actually accessed through forEach() or fetch().

		filter: function (query) {
			// summary:
			//		Filters the collection, returning a new subset collection
			// query: String|Object|Function
			//		The query to use for retrieving objects from the store.
			// returns: Collection
		},
		sort: function (property, descending) {
			// summary:
			//		Sorts the current collection into a new collection, reordering the objects by the provided sort order.
			// property: String|Function
			//		The property to sort on. Alternately a function can be provided to sort with
			// descending?: Boolean
			//		Indicate if the sort order should be descending (defaults to ascending)
			// returns: Collection
		},
		fetchRange: function (kwArgs) {
			// summary:
			//		Retrieves a range of objects from the collection, returning a promise to an array.
			// kwArgs.start: Number
			//		The starting index of objects to return (0-indexed)
			// kwArgs.end: Number
			//		The exclusive end of objects to return
			// returns: Collection
		},
		forEach: function (callback, thisObject) {
			// summary:
			//		Iterates over the query results, based on
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach.
			//		Note that this executes asynchronously, and returns a promise to indicate when the
			//		callback has been executed.
			// callback:
			//		Function that is called for each object in the query results
			// thisObject:
			//		The object to use as |this| in the callback.
			// returns:
			//		Promise
		},
		fetch: function () {
			// summary:
			//		This can be called to materialize and request the data behind this collection.
			//		Often collections may be lazy, and won't retrieve their underlying data until
			//		forEach or fetch is called. This returns an array, or for asynchronous stores,
			//		this will return a promise, resolving to an array of objects, once the
			//		operation is complete.
			//	returns Array|Promise
		},
		on: function (type, listener) {
			// summary:
			//		This registers a callback for notification of when data is modified in the query results.
			// type: String
			//		There are four types of events defined in this API:
			//		- add - A new object was added
			//		- update - An object was updated
			//		- delete - An object was deleted
			// listener: Function
			//		The listener function is called when objects in the query results are modified
			//		to affect the query result. The listener function is called with a single event object argument:
			//		| listener(event);
			//
			//		- The event object as the following properties:
			//		- type - The event type (of the four above)
			//		- target - This indicates the object that was create or modified.
			//		- id - If an object was removed, this indicates the object that was removed.
			//		The next two properties will only be available if array tracking is employed,
			//		which is usually provided by dstore/Trackable
			//		- previousIndex - The previousIndex parameter indicates the index in the result array where
			//		the object used to be. If the value is -1, then the object is an addition to
			//		this result set (due to a new object being created, or changed such that it
			//		is a part of the result set).
			//		- index - The inex parameter indicates the index in the result array where
			//		the object should be now. If the value is -1, then the object is a removal
			//		from this result set (due to an object being deleted, or changed such that it
			//		is not a part of the result set).

		}
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
		// beforeId: String?
		//		If the collection of objects in the store has a natural ordering,
		//		this indicates that the created or updated object should be placed before the
		//		object whose identity is specified as the value of this property. A value of null indicates that the
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

	var __QueryLogEntry = {
		type: String
			The query type
		arguments: Array
			The original query arguments
		normalizedArguments: Array
			The normalized query arguments
		querier: Function?
			A client-side implementation of the query that takes an item array and returns an item array
	};
====*/
