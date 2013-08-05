define(["dojo/request/registry", "dojo/_base/lang", "dojo/has", "dojo/json", "dojo/io-query", "dojo/_base/declare", "./util/QueryResults" /*=====, "./api/Store" =====*/
], function(request, lang, has, JSON, ioQuery, declare, QueryResults /*=====, Store =====*/){

// No base class, but for purposes of documentation, the base class is dojo/store/api/Store
var base = null;
/*===== base = Store; =====*/

/*=====
var __HeaderOptions = {
		// headers: Object?
		//		Additional headers to send along with the request.
	},
	__PutDirectives = declare(Store.PutDirectives, __HeaderOptions),
	__QueryOptions = declare(Store.QueryOptions, __HeaderOptions);
=====*/

// detect __proto__
has.add('object-proto', !!{}.__proto__);
var hasProto = has('object-proto');
function assignPrototype(object, model){
	var prototype = model.prototype;
	if(prototype){
		if(hasProto){
			// the fast easy way
			object.__proto__ = prototype;
			return object;
		}else{
			// create a new object with the correct prototype
			return lang.delegate(prototype, object);
		}
	}
}

return declare("dojo.store.JsonRest", base, {
	// summary:
	//		This is a basic store for RESTful communicating with a server through JSON
	//		formatted data. It implements dojo/store/api/Store.

	constructor: function(options){
		// summary:
		//		This is a basic store for RESTful communicating with a server through JSON
		//		formatted data.
		// options: dojo/store/JsonRest
		//		This provides any configuration information that will be mixed into the store
		this.headers = {};
		declare.safeMixin(this, options);
	},

	// model: Function
	//		This should be a entity (like a class/constructor) with a "prototype" property that will be
	//		used as the prototype for all objects returned from this store.
	model: {},

	// headers: Object
	//		Additional headers to pass in all requests to the server. These can be overridden
	//		by passing additional headers to calls to the store.
	headers: {},

	// parse: Function
	//		This function performs the parsing of the response text from the server. This
	//		defaults to JSON, but other formats can be parsed by providing an alternate
	//		parsing function. If you do want to use an alternate format, you will probably 
	//		want to use an alternate stringify function for the serialization of data as well.
	//		Also, if you want to support parsing a larger set of JavaScript objects
	//		outside of strict JSON parsing, you can provide dojo/_base/json.fromJson as the parse function 
	parse: JSON.parse,

	// stringify: Function
	//		This function performs the serialization of the data for requests to the server. This
	//		defaults to JSON, but other formats can be serialized by providing an alternate
	//		stringify function. If you do want to use an alternate format, you will probably 
	//		want to use an alternate parse function for the parsing of data as well.
	stringify: JSON.stringify,

	// target: String
	//		The target base URL to use for all requests to the server. This string will be
	//		prepended to the id to generate the URL (relative or absolute) for requests
	//		sent to the server
	target: "",

	// idProperty: String
	//		Indicates the property to use as the identity property. The values of this
	//		property should be unique.
	idProperty: "id",

	// sortParam: String
	//		The query parameter to used for holding sort information. If this is omitted, than
	//		the sort information is included in a functional query token to avoid colliding
	//		with the set of name/value pairs.

	// ascendingPrefix: String
	//		The prefix to apply to sort attribute names that are ascending
	ascendingPrefix: "+",

	// descendingPrefix: String
	//		The prefix to apply to sort attribute names that are ascending
	descendingPrefix: "-",
	 

	get: function(id, options){
		// summary:
		//		Retrieves an object by its identity. This will trigger a GET request to the server using
		//		the url `this.target + id`.
		// id: Number
		//		The identity to use to lookup the object
		// options: Object?
		//		HTTP headers. For consistency with other methods, if a `headers` key exists on this object, it will be
		//		used to provide HTTP headers instead.
		// returns: Object
		//		The object in the store that matches the given id.
		options = options || {};
		var headers = lang.mixin({ Accept: this.accepts }, this.headers, options.headers || options);
		var model = this.model;
		var parse = this.parse;
		return request(this.target + id, {
			headers: headers
		}).then(function(response){
			return assignPrototype(parse(response), model);
		});
	},

	// accepts: String
	//		Defines the Accept header to use on HTTP requests
	accepts: "application/javascript, application/json",

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
		//		Stores an object. This will trigger a PUT request to the server
		//		if the object has an id, otherwise it will trigger a POST request.
		// object: Object
		//		The object to store.
		// options: __PutDirectives?
		//		Additional metadata for storing the data.  Includes an "id"
		//		property if a specific id is to be used.
		// returns: dojo/_base/Deferred
		options = options || {};
		var id = ("id" in options) ? options.id : this.getIdentity(object);
		var hasId = typeof id != "undefined";
		var model = this.model;
		var parse = this.parse;
		return request(hasId ? this.target + id : this.target, {
				method: hasId && !options.incremental ? "PUT" : "POST",
				postData: this.stringify(object),
				headers: lang.mixin({
					"Content-Type": "application/json",
					Accept: this.accepts,
					"If-Match": options.overwrite === true ? "*" : null,
					"If-None-Match": options.overwrite === false ? "*" : null
				}, this.headers, options.headers)
			}).then(function(response){
				return assignPrototype(parse(response), model);
			});
	},

	add: function(object, options){
		// summary:
		//		Adds an object. This will trigger a PUT request to the server
		//		if the object has an id, otherwise it will trigger a POST request.
		// object: Object
		//		The object to store.
		// options: __PutDirectives?
		//		Additional metadata for storing the data.  Includes an "id"
		//		property if a specific id is to be used.
		options = options || {};
		options.overwrite = false;
		return this.put(object, options);
	},

	remove: function(id, options){
		// summary:
		//		Deletes an object by its identity. This will trigger a DELETE request to the server.
		// id: Number
		//		The identity to use to delete the object
		// options: __HeaderOptions?
		//		HTTP headers.
		options = options || {};
		return request(this.target + id, {
			method: "DELETE",
			headers: lang.mixin({}, this.headers, options.headers)
		}).then(this.parse);
	},

	query: function(query, options){
		// summary:
		//		Queries the store for objects. This will trigger a GET request to the server, with the
		//		query added as a query string.
		// query: Object
		//		The query to use for retrieving objects from the store.
		// options: __QueryOptions?
		//		The optional arguments to apply to the resultset.
		// returns: dojo/store/api/Store.QueryResults
		//		The results of the query, extended with iterative methods.
		options = options || {};

		var headers = lang.mixin({ Accept: this.accepts }, this.headers, options.headers);

		if(options.start >= 0 || options.count >= 0){
			headers.Range = headers["X-Range"] //set X-Range for Opera since it blocks "Range" header
				 = "items=" + (options.start || '0') + '-' +
				(("count" in options && options.count != Infinity) ?
					(options.count + (options.start || 0) - 1) : '');
		}
		var hasQuestionMark = this.target.indexOf("?") > -1;
		if(query && typeof query == "object"){
			query = ioQuery.objectToQuery(query);
			query = query ? (hasQuestionMark ? "&" : "?") + query: "";
		}
		if(options && options.sort){
			var sortParam = this.sortParam;
			query += (query || hasQuestionMark ? "&" : "?") + (sortParam ? sortParam + '=' : "sort(");
			for(var i = 0; i<options.sort.length; i++){
				var sort = options.sort[i];
				query += (i > 0 ? "," : "") + (sort.descending ? this.descendingPrefix : this.ascendingPrefix) + encodeURIComponent(sort.attribute);
			}
			if(!sortParam){
				query += ")";
			}
		}
		var model = this.model;
		var response = request(this.target + (query || ""), {
			method: "GET",
			headers: headers
		});
		var parse = this.parse;
		var results = QueryResults(response.then(function(response){
			var results = parse(response);
			for(var i = 0, l = results.length; i < l; i++){
				results[i] = assignPrototype(results[i], model);
			}
			return results;
		}));
		results.total = response.response.then(function(response){
			var range = response.getHeader("Content-Range");
			return range && (range = range.match(/\/(.*)/)) && +range[1];
		});
		return results;
	}
});

});