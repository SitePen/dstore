define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "./SimpleQuery" /*=====, "./api/Store" =====*/],
function(declare, lang, arrayUtil, SimpleQuery /*=====, Store =====*/){

// module:
//		dstore/Memory
var hasProto = !!{}.__proto__;
return declare(SimpleQuery, {
	constructor: function(options){
		// summary:
		//		Creates a memory object store.
		// options: dstore/Memory
		//		This provides any configuration information that will be mixed into the store.
		//		This should generally include the data property to provide the starting set of data.
		this.setData(this.data || []);
	},

	// data: Array
	//		The array of all the objects in the memory store
	data: null,

	// idProperty: String
	//		Indicates the property to use as the identity property. The values of this
	//		property should be unique.
	idProperty: "id",

	// index: Object
	//		An index of data indices into the data array by id
	index: null,

	get: function(id){
		// summary:
		//		Retrieves an object by its identity
		// id: Number
		//		The identity to use to lookup the object
		// returns: Object
		//		The object in the store that matches the given id.
		return this.fullData[this.index[id]];
	},
	getIdentity: function(object){
		// summary:
		//		Returns an object's identity
		// object: Object
		//		The object to get the identity from
		// returns: Number
		return object[this.idProperty];
	},
	put: function(object, options){
		// summary:
		//		Stores an object
		// object: Object
		//		The object to store.
		// options: dstore/api/Store.PutDirectives?
		//		Additional metadata for storing the data.  Includes an "id"
		//		property if a specific id is to be used.
		// returns: Number
		var data = this.fullData,
			index = this.index,
			idProperty = this.idProperty;
		var id = object[idProperty] = (options && "id" in options) ? options.id : idProperty in object ? object[idProperty] : Math.random();
		var prototype = this.model.prototype;
		if(prototype && !(object instanceof this.model)){
			if(hasProto){
				// the fast easy way
				object.__proto__ = prototype;
			}else{
				// create a new object with the correct prototype
				object = lang.delegate(prototype, object);
			}
		}
		var store = this.store || this;
		if(id in index){
			// object exists
			if(options && options.overwrite === false){
				throw new Error("Object already exists");
			}
		}
		if(id in index){
			// replace the entry in data
			if(options && options.before){
				// ordering is defined
				data.splice(data[index[id]], 1);
				data.splice(arrayUtil.indexOf(data, options.before), 0, object);
				store._reindex(data);
			}else{
				data[index[id]] = object;
			}
			store.emit('update', {target: object});
		}else{
			// add the new object
			if(options && options.before){
				// ordering is defined
				data.splice(arrayUtil.indexOf(data, options.before), 0, object);
				store._reindex(data);
			}else{
				index[id] = data.push(object) - 1;
			}
			store.emit('add', {target: object});
		}
		return object;
	},
	add: function(object, options){
		// summary:
		//		Creates an object, throws an error if the object already exists
		// object: Object
		//		The object to store.
		// options: dstore/api/Store.PutDirectives?
		//		Additional metadata for storing the data.  Includes an "id"
		//		property if a specific id is to be used.
		// returns: Number
		(options = options || {}).overwrite = false;
		// call put with overwrite being false
		return this.put(object, options);
	},
	remove: function(id){
		// summary:
		//		Deletes an object by its identity
		// id: Number
		//		The identity to use to delete the object
		// returns: Boolean
		//		Returns true if an object was removed, falsy (undefined) if no object matched the id
		var index = this.index;
		var data = this.fullData;
		if(id in index){
			data.splice(index[id], 1);
			// now we have to reindex
			var store = this.store || this;
			store._reindex(data);
			store.emit('remove', {id: id});
			return true;
		}
	},
	setData: function(data){
		// summary:
		//		Sets the given data as the source for this store, and indexes it
		// data: Object[]
		//		An array of objects to use as the source of data.

		if(this.parse){
			data = this.parse(data);
		}
		if(data.items){
			// just for convenience with the data format IFRS expects
			this.idProperty = data.identifier || this.idProperty;
			data = data.items;
		}
		var store = this.store || this;
		store._reindex(data);
		store.emit('refresh');
	},

	_reindex: function(data){
		this.fullData = data;
		this.index = {};
		var prototype = this.model.prototype;
		for(var i = 0, l = data.length; i < l; i++){
			var object = data[i];
			if(prototype){
				if(hasProto){
					// the fast easy way
					object.__proto__ = prototype;
				}else{
					// create a new object with the correct prototype
					data[i] = lang.delegate(prototype, object);
				}
			}
			this.index[object[this.idProperty]] = i;
		}

		this.data = data;
		this.total = data.length;
	},
	filter: function(filter){
		var newCollection = this.inherited(arguments);
		var data = newCollection.data = newCollection.queryer(this.data);
		newCollection.total = data.length;
		return newCollection;
	},
	sort: function(sort){
		this.inherited(arguments);
		this.data = this.queryer(this.data);
		return this;
	},
	range: function(start, end){
		var newCollection = this.inherited(arguments);
		newCollection.data = this.data.slice(start || 0, end || Infinity);
		return newCollection;
	},
	fetch: function(){
		if(!this.hasOwnProperty('data')){
			this.data = this.queryer(this.data);
		}
		return this.data;
	},

});

});
