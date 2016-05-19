import {IData} from './interfaces';
import * as promised from './promised';
import QueryResults from './query-results';
import Store from './simple-query-store';
import {Hash} from 'dojo-core/interfaces';

export default class Memory extends Store{
	public autoEmitEvents = false; // this is handled by the methods themselves
	public get = promised.get;
	public put = promised.put;
	public add = promised.add;
	public remove = promised.remove;
	public fetch = promised.fetch;
	public fetchRange = promised.fetchRange;
	public set_data(data: any[]){
		// summary:
		//		Sets the given data as the source for this store, and indexes it
		// data: Object[]
		//		An array of objects to use as the source of data. Note that this
		//		array will not be copied, it is used directly and mutated as
		//		data changes.

		if (this.parse) {
			data = this.parse(data);
		}
		if ((<any>data).items) {
			// just for convenience with the data format ItemFileReadStore expects
			this.idProperty = (<any>data).identifier || this.idProperty;
			data = (<any>data).items;
		}
		let storage = this.storage;
		storage.fullData = this._data = <any>data;
		this._reindex();
		// this._data = data;
	}
	_data: IData<any>;
	get data(): IData<any>{
		return this._data || (this._data = <any>[]);
	}
	constructor(){
		super();
		// Add a version property so subcollections can detect when they're using stale data
		(<any>this.storage).version = 0;
	}
	public getSync(id: string) {
		// summary:
		//		Retrieves an object by its identity
		// id: Number
		//		The identity to use to lookup the object
		// returns: Object
		//		The object in the store that matches the given id.
		return this.storage.fullData[this.storage.index[id]];
	}
	public defaultNewToStart = false;
	public putSync (object: any, options?: any) {
		// summary:
		//		Stores an object
		// object: Object
		//		The object to store.
		// options: dstore/Store.PutDirectives?
		//		Additional metadata for storing the data.  Includes an 'id'
		//		property if a specific id is to be used.
		// returns: Number

		options = options || {};

		let storage = this.storage,
			index = storage.index,
			data = storage.fullData;

		let Model = this.Model;
		if (Model && !(object instanceof Model)) {
			// if it is not the correct type, restore a
			// properly typed version of the object. Note that we do not allow
			// mutation here
			object = this._restore(object);
		}
		let id = this.getIdentity(object);
		if (id == null) {
			this._setIdentity(object, ('id' in options) ? options.id : Math.random());
			id = this.getIdentity(object);
		}
		storage.version++;

		let eventType = id in index ? 'update' : 'add',
			event = { target: object },
			previousIndex: number,
			defaultDestination: number;
		if (eventType === 'update') {
			if (options.overwrite === false) {
				throw new Error('Object already exists');
			} else {
				data.splice(previousIndex = index[id], 1);
				defaultDestination = previousIndex;
			}
		} else {
			defaultDestination = this.defaultNewToStart ? 0 : data.length;
		}

		let destination: number;
		if ('beforeId' in options) {
			let beforeId = options.beforeId;

			if (beforeId === null) {
				destination = data.length;
			} else {
				destination = index[beforeId];

				// Account for the removed item
				if (previousIndex < destination) {
					--destination;
				}
			}

			if (destination !== undefined) {
				(<any>event).beforeId = beforeId;
			} else {
				console.error('options.beforeId was specified but no corresponding index was found');
				destination = defaultDestination;
			}
		} else {
			destination = defaultDestination;
		}
		data.splice(destination, 0, object);

		// the fullData has been changed, so the index needs updated
		let i = isFinite(previousIndex) ? Math.min(previousIndex, destination) : destination;
		for (let l = data.length; i < l; ++i) {
			index[this.getIdentity(data[i])] = i;
		}

		this.emit(eventType, event);

		return object;
	}

	public addSync (object: any, options?: any) {
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
	}
	public removeSync(id: string) {
		// summary:
		//		Deletes an object by its identity
		// id: Number
		//		The identity to use to delete the object
		// returns: Boolean
		//		Returns true if an object was removed, falsy (undefined) if no object matched the id
		let storage = this.storage;
		let index = storage.index;
		let data = storage.fullData;
		if (id in index) {
			let removed = data.splice(index[id], 1)[0];
			// now we have to reindex
			this._reindex();
			this.emit('delete', {id: id, target: removed});
			return true;
		}
	}
	protected _reindex () {
		let storage = this.storage;
		let index = storage.index = <Hash<number>>{};
		let data = storage.fullData;
		let Model = this.Model;
		let ObjectPrototype = Object.prototype;
		for (let i = 0, l = data.length; i < l; i++) {
			let object = data[i];
			if (Model && !(object instanceof Model)) {
				let restoredObject = this._restore(object,
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
	}

	public fetchSync() {
		let data = this.data;
		if (!data || data._version !== this.storage.version) {
			// our data is absent or out-of-date, so we requery from the root
			// start with the root data
			data = this.storage.fullData;
			let queryLog = this.queryLog;
			// iterate through the query log, applying each querier
			for (let i = 0, l = queryLog.length; i < l; i++) {
				data = queryLog[i].querier(data);
			}
			// store it, with the storage version stamp
			data._version = this.storage.version;
			this.data = data;
		}
		return QueryResults(data);
	}

	public fetchRangeSync(kwArgs?: any) {
		let data = this.fetchSync(),
			start = kwArgs.start,
			end = kwArgs.end;
		return QueryResults(data.slice(start, end), {
			totalLength: data.length
		});
	}

	protected _includePropertyInSubCollection (name: string) {
		return name !== 'data' && super._includePropertyInSubCollection(name);
	}
}