define(["dojo/_base/declare", "dojo/has", "dojo/_base/lang", "dojo/_base/array", "./Store"/*=====, "./api/Store" =====*/],
function(declare, has, lang, arrayUtil, Store /*=====, Store =====*/){

// module:
//		dstore/Memory

// No base class, but for purposes of documentation, the base class is dojo/store/api/Store
var base = null;
/*===== base = Store; =====*/


return declare(Store, {
	// summary:
	//		This is a basic in-memory object store. It implements dojo/store/api/Store.
	constructor: function(options){
		// summary:
		//		Creates a memory object store.
		// options: dojo/store/Memory
		//		This provides any configuration information that will be mixed into the store.
		//		This should generally include the data property to provide the starting set of data.
		// TODO: Shouldn't this args mixin be part of Store, not SimpleQuery?
		for(var i in options){
			this[i] = options[i];
		}
	},

	// parse: Function
	//		One can provide a parsing function that will permit the parsing of the data. By
	//		default we assume the provide data is a simple JavaScript array that requires
	//		no parsing
	parse: null,

	// data: Array
	//		The array of all the objects in the memory store
	data:null,

	// idProperty: String
	//		Indicates the property to use as the identity property. The values of this
	//		property should be unique.
	idProperty: "id",

	// index: Object
	//		An index of data indices into the data array by id
	index:null,
	queryer: null,
	_newResults: function(queryer){
		var previousQueryer = this.queryer;
		var newResults = lang.delegate(this, {store: this.store || this});
		if(this.data instanceof Array){
			newResults.data = queryer(this.data);
		}
		newResults.queryer = previousQueryer ? function(data){
			return queryer(previousQueryer(data));
		} : queryer;
		return newResults;
	},
	filter: function(query){
		// create our matching query function
		switch(typeof query){
			default:
				throw new Error("Can not query with a " + typeof query);
			case "object": case "undefined":
				var queryObject = query;
				query = function(object){
					for(var key in queryObject){
						var required = queryObject[key];
						if(required && required.test){
							// an object can provide a test method, which makes it work with regex
							if(!required.test(object[key], object)){
								return false;
							}
						}else if(required != object[key]){
							return false;
						}
					}
					return true;
				};
				break;
			case "string":
				// named query
				if(!this[query]){
					throw new Error("No filter function " + query + " was found in store");
				}
				query = this[query];
				// fall through
			case "function":
				// fall through
		}
		return this._newResults(function(data){
			return arrayUtil.filter(data, query);
		});
	},

	sort: function(property, descending){
		return this._newResults(function(data){
			var sortedResults = data.slice(0);
			sortedResults.sort(typeof property == "function" ? property : function(a, b){
				var aValue = a[property];
				var bValue = b[property];
				if (aValue != bValue){
					return !!descending == (aValue == null || aValue > bValue) ? -1 : 1;
				}
				return 0;
			});
			return sortedResults;
		});
	},
	range: function(start, end){
		// now we paginate
		return lang.delegate(this, {
			data: this.data.slice(start || 0, end || Infinity),
			// TODO: Is this the correct thing to do? Should it be updated when items are added and removed from the data?
			total: this.data.length,
			store: this.store || this
		});
	}
});

});
