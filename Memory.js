define(["dojo/_base/declare", "dojo/_base/lang", "./SimpleQuery" /*=====, "./api/Store" =====*/],
function(declare, lang, SimpleQuery /*=====, Store =====*/){

// module:
//		dstore/Memory
var hasProto = !!{}.__proto__;
return declare(SimpleQuery, {
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
		// options: dojo/store/api/Store.PutDirectives?
		//		Additional metadata for storing the data.  Includes an "id"
		//		property if a specific id is to be used.
		// returns: Number
		var data = this.fullData,
			index = this.index,
			idProperty = this.idProperty;
		var id = object[idProperty] = (options && "id" in options) ? options.id : idProperty in object ? object[idProperty] : Math.random();
		var prototype = this.model.prototype;
		if(prototype){
			if(hasProto){
				// the fast easy way
				object.__proto__ = prototype;
			}else{
				// create a new object with the correct prototype
				object = lang.delegate(prototype, object);
			}
		}		
		if(id in index){
			// object exists
			if(options && options.overwrite === false){
				throw new Error("Object already exists");
			}
			// replace the entry in data
			data[index[id]] = object;
		}else{
			// add the new object
			index[id] = data.push(object) - 1;
		}
		return object;
	},
	add: function(object, options){
		// summary:
		//		Creates an object, throws an error if the object already exists
		// object: Object
		//		The object to store.
		// options: dojo/store/api/Store.PutDirectives?
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
			this.setData(data);
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
		this.fullData = this.data = data;
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
	}
});

});
