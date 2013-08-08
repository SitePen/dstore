define(["dojo/request/registry", "dojo/_base/lang", "dojo/json", "dojo/io-query", "dojo/_base/declare", "./Store"
], function(request, lang, JSON, ioQuery, declare, Store){


/*=====
var __HeaderOptions = {
		// headers: Object?
		//		Additional headers to send along with the request.
	},
	__PutDirectives = declare(Store.PutDirectives, __HeaderOptions),
	__QueryOptions = declare(Store.QueryOptions, __HeaderOptions);
=====*/
return declare(Store, {
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
	 
	query: '?',
	_createWithQuery: function(query){
		return lang.delegate(this, {
			target: this.target + query,
			store: this
		});
		
	},
	filter: function(query){
		if(query && typeof query == "object"){
			query = ioQuery.objectToQuery(query);
			query = query ? (this.query.length > 1 ? "&" : "") + query: "";
		}
		return this._createWithQuery(query);
	},
	sort: function(attribute, descending){
		query += (query || hasQuestionMark ? "&" : "?") + (sortParam ? sortParam + '=' : "sort(");
		for(var i = 0; i<options.sort.length; i++){
			var sort = options.sort[i];
			query += (i > 0 ? "," : "") + (sort.descending ? this.descendingPrefix : this.ascendingPrefix) + encodeURIComponent(sort.attribute);
		}
		if(!sortParam){
			query += ")";
		}
		return this._createWithQuery(query);
	},
	range: function(start, end){
		var results = this._createWithQuery(query);
		results.headers = lang.delegate(this.headers,{
			Range: "items=" + (start || '0') + '-' +
				((end > -1 && end != Infinity) ?
					(end - 1) : '')
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
	forEach: function(callback, thisObj){
		if(!this.hasOwnProperty('data')){
			// perform the actual query
			var response = request(this.target + (this.query || ""), {
				method: "GET",
				headers: lang.delegate(this.headers, { Accept: this.accepts })
			});
			var parse = this.parse;
			var store = this;
			this.data = response.then(function(response){
				var results = parse(response);
				for(var i = 0, l = results.length; i < l; i++){
					results[i] = store.assignPrototype(results[i]);
				}
				return results;
			});
			this.total = response.response.then(function(response){
				var range = response.getHeader("Content-Range");
				return range && (range = range.match(/\/(.*)/)) && +range[1];
			});
		}
		this.data.then(function(results){
			for(var i = 0, l = results.length; i < l; i++){
				callback.call(thisObj, results[i]);
			}
		});
		return this.data;
	}
});

});