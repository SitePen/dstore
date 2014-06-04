define(['dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/array', './Store', './objectQueryEngine' /*=====, './api/Store' =====*/],
		// TODO: Do we still need the api/Store dep for docs? If not, remove it and rename StoreBase to Store.
		function (declare, lang, arrayUtil, StoreBase, objectQueryEngine /*=====, Store =====*/) {

	function createQuery(updateTotal) {
		return function query () {
			var newCollection = this.inherited(arguments),
				queryer = newCollection.queryLog[newCollection.queryLog.length - 1].queryer;

			var data = newCollection.data = queryer(this.data);
			newCollection.total = updateTotal ? data.length : this.total;
			return newCollection;
		};
	}

	// module:
	//		dstore/Memory
	/* jshint proto: true */
	var hasProto = !!{}.__proto__;
	return declare(StoreBase, {
		constructor: function () {
			// summary:
			//		Creates a memory object store.
			// options: dstore/Memory
			//		This provides any configuration information that will be mixed into the store.
			//		This should generally include the data property to provide the starting set of data.

			this.setData(this.data || []);
		},


		_moveElement: function(from, to) {
			// summary:
			//	  Move an element, updating the index
			// from: number
			//		The index of the item to be moved
			// to: number
			//		The index where the item will be shifted to
			// returns: nothing

			var storage = this.storage,
				data = storage.fullData,
				index = storage.index,
				idProperty = this.idProperty;

			if( to == from ) return;

			var target = data[from];
			var increment = to < from ? -1 : 1;

			for(var k = from; k != to; k += increment){
				data[k] = data[k + increment];
				index[data[k][idProperty]] = k;
			}

			data[to] = target;
			index[data[to][idProperty]] = k;
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
			var storage = this.storage,
				index = storage.index,
				data = storage.fullData;

			var model = this.model;
			if (model && !(object instanceof model)) {
				var prototype = model.prototype;
				if (hasProto) {
					// the fast easy way
					object.__proto__ = prototype;
				} else {
					// create a new object with the correct prototype
					object = lang.delegate(prototype, object);
				}
			}
			var id = this.getIdentity(object);
			if (id == null) {
				this._setIdentity(object, (options && 'id' in options) ? options.id : Math.random());
				id = this.getIdentity(object);
			}

			var eventType;
			if (id in index) {
				// object exists
				if (options && options.overwrite === false) {
					throw new Error('Object already exists');
				}
				// replace the entry in data
				data[index[id]] = object;
				eventType = 'update';
			} else {
				// add the new object
				index[id] = data.push(object) - 1;
				eventType = 'add';
			}


			// If options.before is set, and there is an element in that spot in the array...
			if( options && options.before ){

				// Work out `from` and `to`, depending on options.before
				var from = index[ object[ this.idProperty ] ];
				var to = options.before === null ? data.length : index[options.before[this.idProperty]];
				if(to > from) to --;

				// Only perform the move if `from` and `to` both exist
				if(typeof(from) !== 'undefined' && typeof(to) !== 'undefined'){
					// Move the element from the last spot to where it should go
					this._moveElement(from, to);
					//console.log("DATA, INDEX: ", data, index );
				}
			}

			// Now that the item has been placed, it's time to emit the event
			this.emit(eventType, {target: object});

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
				data.splice(index[id], 1);
				// now we have to reindex
				this._reindex();
				// TODO: The id property makes it seem like an event id. Maybe targetId would be better.
				this.emit('remove', {id: id});
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
		},

		filter: createQuery(true),
		sort: createQuery(),
		range: createQuery(),

		fetch: function () {
			return this.data;
		}
	});

});
