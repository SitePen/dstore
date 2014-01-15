define([
	"dojo/request/registry",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/json",
	"dojo/io-query",
	"dojo/_base/declare",
	"./Store"
], function(request, lang, array, JSON, ioQuery, declare, Store){


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
	//		formatted data. It implements dstore/api/Store.

	constructor: function(options) {
		// summary:
		//		This is a basic store for RESTful communicating with a server through JSON
		//		formatted data.
		// options: dstore/JsonRest
		//		This provides any configuration information that will be mixed into the store
		this.headers || (this.headers = {});
		this._sort = [];
	},

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
	//		The prefix to apply to sort property names that are ascending
	ascendingPrefix: "+",

	// descendingPrefix: String
	//		The prefix to apply to sort property names that are ascending
	descendingPrefix: "-",

	sort: function(){
		// clear the old data
		delete this.data;
		return this.inherited(arguments);
	},

	range: function(start, end){
		return lang.mixin(this.inherited(arguments),{
			headers: lang.delegate(this.headers,{
				Range: "items=" + (start || '0') + '-' +
					((end > -1 && end != Infinity) ?
						(end - 1) : '')
			})
		});
	},

	// accepts: String
	//		Defines the Accept header to use on HTTP requests
	accepts: "application/json",

	getIdentity: function(object){
		// summary:
		//		Returns an object's identity
		// object: Object
		//		The object to get the identity from
		// returns: Number
		return object[this.idProperty];
	},

	fetch: function(){
		if(!this.hasOwnProperty('data')){
			// perform the actual query
			var response = request(this._renderUrl(), {
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
		return this.data;
	},

	_renderFilterParams: function(){
		// summary:
		//		Constructs filter-related params to be inserted into the query string
		// returns: String
		//		Filter-related params to be inserted in the query string
		return this.filtered && array.map(this.filtered, function(filter){
			return typeof filter === "object" ? ioQuery.objectToQuery(filter) : filter;
		}).join("&");
	},

	_renderSortParams: function(){
		// summary:
		//		Constructs sort-related params to be inserted in the query string
		// returns: String
		//		Sort-related params to be inserted in the query string
		var sortString = "";

		if(this.sorted){
			sortString = array.map(this.sorted, function(sortOption){
				var prefix = sortOption.descending ? this.descendingPrefix : this.ascendingPrefix;
				return prefix + encodeURIComponent(sortOption.property);
			}, this).join(",");
		}

		return sortString && (this.sortParam
			? encodeURIComponent(this.sortParam) + "=" + sortString
			: "sort(" + sortString + ")"
		);
	},

	_renderUrl: function(){
		// summary:
		//		Constructs the URL used to fetch the data.
		// returns: String
		//		The URL of the data
		var filterParamString = this._renderFilterParams(),
			sortParamString = this._renderSortParams();

		var query = "";
		if(filterParamString || sortParamString){
			query += "?";

			if(filterParamString){
				query += filterParamString;
			}
			if(sortParamString){
				query += (filterParamString ? "&" : "") + sortParamString;
			}
		}

		return this.target + query;
	},
});

});
