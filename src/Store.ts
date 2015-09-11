import * as aspect from 'dojo-core/aspect';
import Evented from 'dojo-core/Evented';
import { default as has, add as hasAdd } from 'dojo-core/has';
import { Hash } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import Filter from './Filter';
import * as dstore from './interfaces';
import QueryMethod, { QueryMethodArgs } from './QueryMethod';

// Detect __proto__, and avoid using it on Firefox, as they warn about
// deoptimizations. The watch method is a clear indicator of the Firefox
// JS engine.
hasAdd('object-proto', Boolean((<any> {})['__proto__']) && !(<any> {}).watch);
const hasProto = has('object-proto');

export interface NewableStoreModel {
	new (args?: {}): any;
	createSubclass?: (arg: any[]) => any;
	prototype: any;
}

export interface StoreArgs {
	Model?: NewableStoreModel;
}
abstract class Store<T> extends Evented implements dstore.Collection<T>, Hash<any> {
	[ index: string ]: any;

	/**
	 * Indicates if the events should automatically be fired for put, add, remove
	 * method calls. Stores may wish to explicitly fire events, to control when
	 * and which event is fired.
	 */
	autoEmitEvents: boolean = true;

	Filter: typeof Filter = Filter;

	/**
	 * Indicates the property to use as the identity property. The values of this
	 * property should be unique.
	 */
	idProperty: string = 'id';

	/**
	 * This should be a entity (like a class/constructor) with a 'prototype' property that will be
	 * used as the prototype for all objects returned from this store. One can set
	 * this to the Model from dmodel/Model to return Model objects, or leave this
	 * to null if you don't want any methods to decorate the returned
	 * objects (this can improve performance by avoiding prototype setting),
	 */
	Model: NewableStoreModel;

	/**
	 * Indicates if client-side query engine filtering should (if the store property is true)
	 * access object properties through the get() function (enabling querying by
	 * computed properties), or if it should (by setting this to false) use direct/raw
	 * property access (which may more closely follow database querying style).
	 */
	queryAccessors: boolean = true;

	/**
	 * The query operations represented by this collection
	 */
	queryLog: dstore.QueryLogEntry<any>[] = [];

	storage: Evented;

	constructor(options?: StoreArgs) {
		super();
		this._initialize();
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
		const store = this;
		if (this.autoEmitEvents) {
			// emit events when modification operations are called
			aspect.after(this, 'add', <any> this._emitUpdateEvent('add'));
			aspect.after(this, 'put', <any> this._emitUpdateEvent('update'));
			aspect.after(this, 'remove', function (result, args) {
				result.then(function (result: Promise<any>) {
					store.emit({
						type: 'delete',
						id: args[0]
					});
				});

				return result;
			});
		}
	}

	protected _createSubCollection(kwArgs: {}) {
		let newCollection = <Hash<any>> Object.create(this.constructor.prototype);

		for (let i in this) {
			if (this._includePropertyInSubCollection(i, newCollection)) {
				newCollection[i] = this[i];
			}
		}

		return lang.mixin(newCollection, kwArgs);
	}

	protected _emitUpdateEvent(type: string) {
		return function (result: Promise<any>, args: { beforeId: string | number }[]) {
			result.then((result: Promise<any>) => {
				const event: Hash<any> = {
					target: result,
					type: type
				};
				const options = args[1] || <any> {};
				if ('beforeId' in options) {
					event['beforeId'] = options.beforeId;
				}
				this.emit(event);
			});

			return result;
		};
	}

	protected _getQuerierFactory(type: string) {
		const uppercaseType = type[0].toUpperCase() + type.substr(1);
		return this['_create' + uppercaseType + 'Querier'];
	}

	protected _initialize(): void {
	}

	protected _includePropertyInSubCollection(name: string, subCollection: Hash<any>) {
		return !(name in subCollection) || subCollection[name] !== this[name];
	}

	/**
	 * Restores a plain raw object, making an instance of the store's model.
	 * This is called when an object had been persisted into the underlying
	 * medium, and is now being restored. Typically restored objects will come
	 * through a phase of deserialization (through JSON.parse, DB retrieval, etc.)
	 * in which their __proto__ will be set to Object.prototype. To provide
	 * data model support, the returned object needs to be an instance of the model.
	 * This can be accomplished by setting __proto__ to the model's prototype
	 * or by creating a new instance of the model, and copying the properties to it.
	 * Also, model's can provide their own restore method that will allow for
	 * custom model-defined behavior. However, one should be aware that copying
	 * 	properties is a slower operation than prototype assignment.
	 * The restore process is designed to be distinct from the create process
	 * so their is a clear delineation between new objects and restored objects.
	 *
	 * @param object The raw object with the properties that need to be defined on the new
	 * model instance
	 * @param mutateAllowed This indicates if restore is allowed to mutate the original object
	 * (by setting its __proto__). If this isn't true, than the restore should
	 * copy the object to a new object with the correct type.
	 * @return An instance of the store model, with all the properties that were defined
	 * on object. This may or may not be the same object that was passed in.
	 */
	protected _restore(object: Hash<any>, mutateAllowed: boolean) {
		const Model = this.Model;
		if (Model && object) {
			const prototype = Model.prototype;
			const restore = prototype._restore;
			if (restore) {
				// the prototype provides its own restore method
				object = restore.call(object, Model, mutateAllowed);
			} else if (hasProto && mutateAllowed) {
				// the fast easy way
				// http://jsperf.com/setting-the-prototype
				object['__proto__'] = prototype;
			} else {
				// create a new object with the correct prototype
				object = <Hash<any>> lang.create(prototype, object);
			}
		}
		return object;
	}

	/**
	 * Sets an object's identity and is useful to override to support
	 * multi-key identities and objects whose properties are not stored directly on the object.
	 *
	 * @param object The target object
	 * @param identityArg The argument used to set the identity
	 */
	protected _setIdentity(object: { [ index: string ]: any; set: (...args: any[]) => any}, identityArg: string | number) {
		if (object.set) {
			object.set(this.idProperty, identityArg);
		} else {
			object[this.idProperty] = identityArg;
		}
	}

	/**
	 * Creates an object, throws an error if the object already exists
	 *
	 * @param object The object to store.
	 * @param directives Additional directives for creating objects.
	 *
	 * @return The object that was stored, with any changes that were made by
	 * the storage system (like generated id)
	 */
	abstract add(object: T, directives?: dstore.PutDirectives):  Promise<T>;

	abstract fetch(args?: dstore.FetchArgs): dstore.FetchPromise<T>;

	/**
	 * Retrieves a range of objects from the collection, returning a promise to an array.
	 *
	 * @param args Contains the starting index of objects to return (0-indexed)
	 * and the exclusive end of objects to return
	 * @return A FetchPromise that will resolve with the results of the fetch
	 */
	abstract fetchRange(args: dstore.FetchRangeArgs):dstore.FetchPromise<T>;

	/**
	 * Retrieves an object by its identity
	 *
	 * @param id The identity to use to lookup the object
	 * @return The object in the store that matches the given id.
	 */
	abstract get(id: string | number): Promise<T> | void;


	/**
	 * Stores an object
	 *
	 * @param object The object to store.
	 * @param directives Additional directives for storing objects.
	 * @return The object that was stored, with any changes that were made by
	 * the storage system (like generated id)
	 */
	abstract put(object: any, directives?: dstore.PutDirectives): Promise<any>;

	/**
	 * Deletes an object by its identity
	 *
	 * @param id The identity to use to delete the object
	 */
	abstract remove(id: string | number): Promise<T | void>;

	/**
	 * This creates a new instance from the store's model.
	 * @param properties The properties that are passed to the model constructor to
	 * be copied onto the new instance. Note, that should only be called
	 * when new objects are being created, not when existing objects
	 * are being restored from storage.
	 */
	create(properties: {}) {
		return new this.Model(properties);
	}

	emit(event: dstore.ChangeEvent<T>) {
		return this.storage.emit(event);
	}

	filter<T>(...args: any[]): dstore.Collection<T> {
		return QueryMethod(<QueryMethodArgs<T>> {
			type: 'filter',
			normalizeArguments: function (filter) {
				const Filter = this.Filter;
				if (filter instanceof Filter) {
					return [ filter ];
				}
				return [ new Filter(filter) ];
			}
		}).apply(this, args);
	}

	/**
	 * Iterates over the query results, based on
	 * https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach.
	 * Note that this executes asynchronously, and returns a promise to indicate when the
	 * callback has been executed.
	 *
	 * @param callback Function that is called for each object in the query results
	 * @parma thisObject The object to use as |this| in the callback.
	 * @return A Promise indicating when the operation is done
	 */
	forEach<T>(callback: (item: T, index: number | string, collection: T[]) => void, thisObject?: any) {
		return this.fetch().then((data) => {
			let i: number;
			let item: any;
			for (i = 0; (item = data[i]) !== undefined; i++) {
				callback.call(thisObject, item, i, this);
			}
			return data;
		});
	}

	/**
	 * Returns an object's identity
	 * @param object The object to get the identity from
	 * @return A string or number representing the identity of the object
	 */
	getIdentity(object: { [ name: string ]: any, get?: (name: string) => any }) {
		return object.get ? object.get(this.idProperty) : object[this.idProperty];
	}

	on(type: string, listener: (event: dstore.ChangeEvent<T>) => void) {
		return this.storage.on(type, listener);
	}

	/**
	 * One can provide a parsing function that will permit the parsing of the data. By
	 * default we assume the provide data is a simple JavaScript array that requires
	 * no parsing (subclass stores may provide their own default parse function)
	 */
	parse(args: any): any {
		return args;
	}

	select<T>(args: string | string[]): dstore.Collection<T> {
		return QueryMethod(<QueryMethodArgs<T>> {
			type: 'select'
		}).apply(this, [ args ]);
	}

	sort<T>(...args: any[]): dstore.Collection<T> {
		return QueryMethod(<QueryMethodArgs<T>> {
			type: 'sort',
			normalizeArguments: function (property, descending) {
				let sorted: any;
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

					sorted = sorted.map(function (sort: dstore.SortOption) {
						// copy the sort object to avoid mutating the original arguments
						sort = <dstore.SortOption> lang.mixin({}, sort);
						sort.descending = Boolean(sort.descending);
						return sort;
					});
					// wrap in array because sort objects are a single array argument
					sorted = [ sorted ];
				}
				return sorted;
			}
		}).apply(this, args);
	}
}

export default Store;
