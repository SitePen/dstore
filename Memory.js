define([
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/has',
	'dojo/_base/array',
	'dojo/when',
	'./Store',
	'./objectQueryEngine',
	'./QueryResults'
	// TODO: Do we still need the api/Store dep for docs? If not, remove it and rename StoreBase to Store.
	/*=====, './api/Store' =====*/
], function (declare, lang, has, arrayUtil, when, StoreBase, objectQueryEngine, QueryResults/*=====, Store =====*/) {

	// module:
	//		dstore/Memory
	return declare(StoreBase, {
		constructor: function () {
			// summary:
			//		Creates a memory object store.
			// options: dstore/Memory
			//		This provides any configuration information that will be mixed into the store.
			//		This should generally include the data property to provide the starting set of data.

			this.setData(this.data || []);
		},

		queryEngine: objectQueryEngine,

		// data: Array
		//		The array of all the objects in the memory store
		data: null,

		autoEmitEvents: false, // this is handled by the methods themselves

		get: function (id) {
			// summary:
			//		Retrieves an object by its identity
			// id: Number
			//		The identity to use to lookup the object
			// returns: Object
			//		The object in the store that matches the given id.
			return this.storage.fullData[this.storage.index[id]];
		},
		put: function (object, options) {
			// summary:
			//		Stores an object
			// object: Object
			//		The object to store.
			// options: dstore/Store.PutDirectives?
			//		Additional metadata for storing the data.  Includes an 'id'
			//		property if a specific id is to be used.
			// returns: Number

			options = options || {};

			var storage = this.storage,
				index = storage.index,
				data = storage.fullData;

			var model = this.model;
			if (model && !(object instanceof model)) {
				var prototype = model.prototype;
				if (has('object-proto')) {
					// the fast easy way
					object.__proto__ = prototype;
				} else {
					// create a new object with the correct prototype
					object = lang.delegate(prototype, object);
				}
			}
			var id = this.getIdentity(object);
			if (id == null) {
				this._setIdentity(object, ('id' in options) ? options.id : Math.random());
				id = this.getIdentity(object);
			}
			storage.version++;

			var eventType = id in index ? 'update' : 'add',
				event = { target: object },
				previousIndex,
				defaultDestination;
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

			var destination;
			if ('beforeId' in options) {
				var beforeId = options.beforeId;
				destination = beforeId !== null ? index[beforeId] : data.length;

				if (destination !== undefined) {
					event.beforeId = beforeId;
				} else {
					console.error('options.beforeId was specified but no corresponding index was found');
					destination = defaultDestination;
				}
			} else {
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
		},
		add: function (object, options) {
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
			return this.put(object, options);
		},
		remove: function (id) {
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
				// TODO: The id property makes it seem like an event id. Maybe targetId would be better.
				this.emit('remove', {id: id, target: removed});
				return true;
			}
		},
		setData: function (data) {
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
			storage.fullData = this.data = data;
			this.total = data.length;
			this._reindex();
			this.emit('refresh');
		},

		_reindex: function () {
			var storage = this.storage;
			var index = storage.index = {};
			var data = storage.fullData;
			var model = this.model;
			var prototype = model && model.prototype;
			for (var i = 0, l = data.length; i < l; i++) {
				var object = data[i];
				if (model && !(object instanceof model)) {
					var restoredObject = this._restore(object);
					if (object !== restoredObject) {
						// a new object was generated in the restoration process,
						// so we have to update the item in the data array.
						data[i] = object = restoredObject;
					}
				}
				index[this.getIdentity(object)] = i;
			}
			storage.version++;
		},

		fetch: function () {
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
			return new QueryResults(data);
		},

		fetchRange: function (kwArgs) {
			var data = this.fetch(),
				start = kwArgs.start,
				end = kwArgs.end;
			return new QueryResults(when(data, function (data) {
				return data.slice(start, end);
			}), {
				totalLength: data.length
			});
		}
	});
});
