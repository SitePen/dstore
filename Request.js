define([
	'dojo/request/registry',
	'dojo/_base/lang',
	'dojo/_base/array',
	'dojo/json',
	'dojo/io-query',
	'dojo/_base/declare',
	'./Store'
], function (request, lang, arrayUtil, JSON, ioQuery, declare, Store) {

	return declare(Store, {
		// summary:
		//		This is a basic store for RESTful communicating with a server through JSON
		//		formatted data. It extends dstore/Store.

		constructor: function () {
			// summary:
			//		This is a basic store for RESTful communicating with a server through JSON
			//		formatted data.
			// options: dstore/JsonRest
			//		This provides any configuration information that will be mixed into the store
			this.headers || (this.headers = {});
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
		target: '',

		// sortParam: String
		//		The query parameter to used for holding sort information. If this is omitted, than
		//		the sort information is included in a functional query token to avoid colliding
		//		with the set of name/value pairs.

		// ascendingPrefix: String
		//		The prefix to apply to sort property names that are ascending
		ascendingPrefix: '+',

		// descendingPrefix: String
		//		The prefix to apply to sort property names that are ascending
		descendingPrefix: '-',

		// accepts: String
		//		Defines the Accept header to use on HTTP requests
		accepts: 'application/json',

		// useRangeHeaders: Boolean
		//		The indicates if range limits (start and end) should be specified
		//		a Range header, using items units. If this is set to true, a header
		//		be included of the form:
		//			Range: items=start-end

		// rangeStartParam: String
		//		The indicates if range limits (start and end) should be specified
		//		in a query parameter, and what the start parameter should be.
		//		This must be used in conjunction with the rangeCountParam
		//		If this is not specified, the range will
		//		included with a RQL style limit() parameter
		// rangeCountParam: String
		//		The indicates if range limits (start and end) should be specified
		//		in a query parameter, and what the count parameter should be.
		//		This must be used in conjunction with the rangeStartParam
		//		If this is not specified, the range will
		//		included with a RQL style limit() parameter

		fetch: function () {
			if (!this.hasOwnProperty('data')) {
				// perform the actual query
				var headers = lang.delegate(this.headers, { Accept: this.accepts });
				var ranged = this.ranged;
				if (ranged && this.useRangeHeaders) {
					// use range headers
					headers.Range = headers['X-Range'] //set X-Range for Opera since it blocks "Range" header
						= 'items=' + (ranged.start || '0') + '-' + ((ranged.end || Infinity) - 1);
				}
				var response = request(this._renderUrl(), {
					method: 'GET',
					headers: headers
				});
				var parse = this.parse;
				var collection = this;
				this.data = response.then(function (response) {
					var results = parse(response);
					// support items in the results
					results = results.items || results;
					for (var i = 0, l = results.length; i < l; i++) {
						results[i] = collection._restore(results[i]);
					}
					return results;
				});
				this.total = response.response.then(function (response) {
					// TODO: response.data isn't existing in the Request tests. Fix it.
					var total = response.data.total;
					if (total > -1) {
						// if we have a valid positive number from the data,
						// we can use that
						return total;
					}
					var range = response.getHeader('Content-Range');
					return range && (range = range.match(/\/(.*)/)) && +range[1];
				});
				this.data.then(null, function () {
					// if there was an error, reset the data, so we could
					// potentially try it again. This could include
					// cancelation
					delete collection.data;
					delete collection.total;
				});
			}
			return this.data;
		},

		_renderFilterParams: function (filter) {
			// summary:
			//		Constructs filter-related params to be inserted into the query string
			// returns: String
			//		Filter-related params to be inserted in the query string
			return [ typeof filter === 'object' ? ioQuery.objectToQuery(filter) : filter ];
		},
		_renderSortParams: function (sort) {
			// summary:
			//		Constructs sort-related params to be inserted in the query string
			// returns: String
			//		Sort-related params to be inserted in the query string

			var sortString = arrayUtil.map(sort, function (sortOption) {
				var prefix = sortOption.descending ? this.descendingPrefix : this.ascendingPrefix;
				return prefix + encodeURIComponent(sortOption.property);
			}, this);

			var params = [];
			if (sortString) {
				params.push(this.sortParam
					? encodeURIComponent(this.sortParam) + '=' + sortString
					: 'sort(' + sortString + ')'
				);
			}
			return params;
		},
		_renderRangeParams: function (range) {
			// summary:
			//		Constructs range-related params to be inserted in the query string
			// returns: String
			//		Range-related params to be inserted in the query string
			var params = [];
			if (!this.useRangeHeaders) {
				var start = range.start;
				var end = range.end;
				if (this.rangeStartParam) {
					params.push(
						this.rangeStartParam + '=' + start,
						this.rangeCountParam + '=' + (end - start)
					);
				} else {
					params.push('limit(' + (end - start) + (start ? (',' + start) : '') + ')');
				}
			}
			return params;
		},

		_renderUrl: function () {
			// summary:
			//		Constructs the URL used to fetch the data.
			// returns: String
			//		The URL of the data

			var queryParams = [],
				push = queryParams.push;
			arrayUtil.forEach(this.queryLog, function (entry) {
				var type = entry.type,
					renderMethod = '_render' + type[0].toUpperCase() + type.substr(1) + 'Params';

				if (this[renderMethod]) {
					push.apply(queryParams, this[renderMethod](entry.value));
				} else {
					console.warn('Unable to render query params for "' + type + '" query', entry);
				}
			}, this);

			var url = this.target;
			if (queryParams.length > 0) {
				url += '?' + queryParams.join('&');
			}
			return url;
		}
	});

});
