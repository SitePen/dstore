import {IData} from './interfaces';
import QueryMethod from './QueryMethod';
import {after} from 'dojo-core/aspect';
import Evented from 'dojo-core/Evented';
import {Hash} from 'dojo-core/interfaces';
import {mixin} from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';

const hasProto = !!(<any>{}).__proto__ && !(<any>{}).watch;

function when(valueOrPromise: any, callback?: (value: any) => any) {
	let receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";

	if(!receivedPromise){
		if(arguments.length > 1){
			return callback ? callback(valueOrPromise) : valueOrPromise;
		}else{
			return new Promise((resolve, reject) => {
				resolve(valueOrPromise);
			});
		}
	}

	if(callback){
		return valueOrPromise.then(callback);
	}
	return valueOrPromise;
}

// boodman/crockford delegation w/ cornford optimization
class TMP{}
function delegate(obj: any, props?: any): any{
	TMP.prototype = obj;
	var tmp = new TMP();
	TMP.prototype = null;
	if(props){
		mixin(tmp, props);
	}
	return tmp; // Object
}

export class Storage extends Evented {
	fullData = <IData<any>>[];
	version = 0;
	index : Hash<number>;
}

export default class Store{
	protected storage = new Storage();
	constructor(options?: any){
		mixin(this, options);
		if (this.Model && this.Model.createSubclass) {
			// we need a distinct model for each store, so we can
			// save the reference back to this store on it.
			// we always create a new model to be safe.
			this.Model = this.Model.createSubclass([]).extend({
				// give a reference back to the store for saving, etc.
				_store: this
			});
		}

		let store = this;
		if (this.autoEmitEvents) {
			// emit events when modification operations are called
			after(this, 'add', (originalReturn: any, originalArgs: IArguments)=>{
				when(originalReturn, (result: any) => {
					let event = <{
						target: any;
						beforeId: string;
					}>{ target: originalReturn },
						options = originalArgs[1] || {};
					if ('beforeId' in options) {
						event.beforeId = options.beforeId;
					}
					this.emit('add', event);
				});
				return originalReturn;
			});
			after(this, 'put', (originalReturn: any, originalArgs: IArguments)=>{
				when(originalReturn, (result: any) => {
					let event = <{
						target: any;
						beforeId: string;
					}>{ target: originalReturn },
						options = originalArgs[1] || {};
					if ('beforeId' in options) {
						event.beforeId = options.beforeId;
					}
					this.emit('update', event);
				});
				return originalReturn;
			});
			after(this, 'remove', function (result, args) {
				when(result, function () {
					store.emit('delete', {id: args[0]});
				});
				return result;
			});
		}
	}
	// autoEmitEvents: Boolean
	//		Indicates if the events should automatically be fired for put, add, remove
	//		method calls. Stores may wish to explicitly fire events, to control when
	//		and which event is fired.
	public autoEmitEvents = true;

	// idProperty: String
	//		Indicates the property to use as the identity property. The values of this
	//		property should be unique.
	public idProperty = 'id';

	// queryAccessors: Boolean
	//		Indicates if client-side query engine filtering should (if the store property is true)
	//		access object properties through the get() function (enabling querying by
	//		computed properties), or if it should (by setting this to false) use direct/raw
	// 		property access (which may more closely follow database querying style).
	public queryAccessors = true;
	
	public getIdentity(object: any) {
		// summary:
		//		Returns an object's identity
		// object: Object
		//		The object to get the identity from
		// returns: String|Number

		return object.get ? object.get(this.idProperty) : object[this.idProperty];
	}

	public _setIdentity(object: any, identityArg: any) {
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
			object[this.idProperty] = identityArg;
		}
	}
	
	public fetch: any;

	public forEach(callback: any, thisObject: any) {
		let collection = this;
		return when(this.fetch(), function (data) {
			for (let i = 0, item: any; (item = data[i]) !== undefined; i++) {
				callback.call(thisObject, item, i, collection);
			}
			return data;
		});
	}
	public on(type: string, listener: (evt: any)=> any) {
		return this.storage.on(type, listener);
	}
	public emit(type: string, event: any) {
		event = event || {};
		event.type = type;
		try {
			return this.storage.emit(event);
		} finally {
			// Return the initial value of event.cancelable because a listener error makes it impossible
			// to know whether the event was actually canceled
			return event.cancelable;
		}
	}

	// parse	//		One can provide a parsing function that will permit the parsing of the data. By
	//		default we assume the provide data is a simple JavaScript array that requires
	//		no parsing (subclass stores may provide their own default parse function)
	public parse: (s: any) => any;

	// stringify	//		For stores that serialize data (to send to a server, for example) the stringify
	//		function can be specified to control how objects are serialized to strings
	public stringify: (o: any) => string;

	// Model	//		This should be a entity (like a class/constructor) with a 'prototype' property that will be
	//		used as the prototype for all objects returned from this store. One can set
	//		this to the Model from dmodel/Model to return Model objects, or leave this
	//		to null if you don't want any methods to decorate the returned
	//		objects (this can improve performance by avoiding prototype setting),
	Model: any;

	protected _restore(object: any, mutateAllowed?: boolean) {
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
		let Model = this.Model;
		if (Model && object) {
			let prototype = Model.prototype;
			let restore = prototype._restore;
			if (restore) {
				// the prototype provides its own restore method
				object = restore.call(object, Model, mutateAllowed);
			} else if (hasProto && mutateAllowed) {
				// the fast easy way
				// http://jsperf.com/setting-the-prototype
				object.__proto__ = prototype;
			} else {
				// create a new object with the correct prototype
				object = delegate(prototype, object);
			}
		}
		return object;
	}

	public create(properties: any) {
		// summary:
		//		This creates a new instance from the store's model.
		//	properties:
		//		The properties that are passed to the model constructor to
		//		be copied onto the new instance. Note, that should only be called
		//		when new objects are being created, not when existing objects
		//		are being restored from storage.
		return new this.Model(properties);
	}

	protected _createSubCollection(kwArgs: any) {
		let newCollection = delegate(this.constructor.prototype);

		for (let i in this) {
			if (this._includePropertyInSubCollection(i, newCollection)) {
				newCollection[i] = (<any>this)[i];
			}
		}

		return mixin(newCollection, kwArgs);
	}

	protected _includePropertyInSubCollection(name: string, subCollection?: Store) {
		return !(name in subCollection) || (<any>subCollection)[name] !== (<any>this)[name];
	}

	// queryLog: __QueryLogEntry[]
	//		The query operations represented by this collection
	public queryLog = <any[]>[];	// NOTE: It's ok to define this on the prototype because the array instance is never modified

	public filter = QueryMethod({
		type: 'filter',
		normalizeArguments(filter) {
			let Filter = this.Filter;
			if (filter instanceof Filter) {
				return [filter];
			}
			return [new Filter(filter)];
		}
	})

	// Filter = Filter;
	Filter: any;

	sort = QueryMethod({
		type: 'sort',
		normalizeArguments(property, descending) {
			let sorted: any[];
			if (typeof property === 'function') {
				sorted = [ property ];
			} else {
				if (property instanceof Array) {
					sorted = property.slice();
				} else if (typeof property === 'object') {
					sorted = [].slice.call(arguments);
				} else {
					sorted = [{ property: property, descending: descending }];
				}

				sorted = sorted.map((sort) => {
					// copy the sort object to avoid mutating the original arguments
					sort = mixin({}, sort);
					sort.descending = !!sort.descending;
					return sort;
				});
				// wrap in array because sort objects are a single array argument
				sorted = [ sorted ];
			}
			return sorted;
		}
	})

	select = QueryMethod({
		type: 'select'
	});

	protected _getQuerierFactory(type: any): any {
		let uppercaseType = type[0].toUpperCase() + type.substr(1);
		return (<any>this)['_create' + uppercaseType + 'Querier'];
	}
}