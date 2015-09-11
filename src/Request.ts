import { Hash } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import request, { Response, ResponsePromise } from 'dojo-core/request';
import Filter from './Filter';
import * as dstore from './interfaces';
import QueryResults from './QueryResults';
import Store, { NewableStoreModel, StoreArgs } from './Store';

const push = [].push;

export interface RequestStoreArgs extends StoreArgs{
	target?: string;
	headers?: {};
	Model?: NewableStoreModel;
	parse?: () => any;
}

export interface RequestResponse<T> {
	data: dstore.FetchPromise<T>;
	total: Promise<number>;
	response: ResponsePromise<T>;
};

abstract class Request<T> extends Store<T> implements dstore.Collection<T> {
	/**
	 * A flag indicating whether the target contains a query string
	 */
	protected _targetContainsQueryString: boolean;

	/**
	 * Defines the Accept header to use on HTTP requests
	 */
	accepts: string;

	/**
	 * The prefix to apply to sort property names that are ascending
	 */
	ascendingPrefix: string;

	/**
	 * The prefix to apply to sort property names that are ascending
	 */
	descendingPrefix: string;

	/**
	 * Additional headers to pass in all requests to the server. These can be overridden
	 * by passing additional headers to calls to the store.
	 */
	headers: Hash<string>;

	/**
	 * The indicates if range limits (start and end) should be specified
	 * in a query parameter, and what the start parameter should be.
	 * This must be used in conjunction with the rangeCountParam
	 * If this is not specified, the range will
	 * included with a RQL style limit() parameter
	 */
	rangeStartParam: string;

	/**
	 * The indicates if range limits (start and end) should be specified
	 * in a query parameter, and what the count parameter should be.
	 * This must be used in conjunction with the rangeStartParam
	 * If this is not specified, the range will
	 * included with a RQL style limit() parameter
	 */
	rangeCountParam: string;

	/**
	 * This will specify the query parameter to use for specifying the
	 * 'select` properties. This will default to `select(<properties>)`
	 * in the query string.
	 */
	selectParam: string;

	/**
	 * The query parameter to used for holding sort information. If this is omitted, than
	 * the sort information is included in a functional query token to avoid colliding
	 * with the set of name/value pairs.
	 */
	sortParam: string;

	/**
	 * The target base URL to use for all requests to the server. This string will be
	 * prepended to the id to generate the URL (relative or absolute) for requests
	 * sent to the server
	 */
	target: string;

	/**
	 * The indicates if range limits (start and end) should be specified
	 * a Range header, using items units. If this is set to true, a header
	 * be included of the form:
	 * Range: items=start-end
	 */
	useRangeHeaders: boolean;

	/**
	 * This is a basic store for RESTful communicating with a server through JSON
	 * formatted data. It extends dstore/Store.
	 * @param options This provides any configuration information that will be mixed into the store
	 */
	constructor(options?: RequestStoreArgs) {
		super(options);
		this._targetContainsQueryString = this.target.lastIndexOf('?') >= 0;
	}

	protected _initialize() {
		this.headers = {};
		this.target = '';
		this.ascendingPrefix = '+';
		this.descendingPrefix = '-';
		this.accepts = 'application/json';
	}
	/**
	 * Constructs filter-related params to be inserted into the query string
	 *
	 * @param filter The filter to render as part of a query string
	 * @return Filter-related params to be inserted in the query string
	 */
	protected _renderFilterParams(filter: Filter): string[] {
		const type = filter.type;
		const args = filter.args;
		if (!type) {
			return [ '' ];
		}
		if (type === 'string') {
			return [ args[0] ];
		}
		if (type === 'and' || type === 'or') {
			const joinToken = type === 'and' ? '&' : '|';
			const renderedArgs = args.map(function (arg) {
				// render each of the arguments to and or or, then combine by the right operator
				const renderedArg = this._renderFilterParams(arg);
				return ((arg.type === 'and' || arg.type === 'or') && arg.type !== type) ?
					// need to observe precedence in the case of changing combination operators
					'(' + renderedArg + ')' : renderedArg;
			}, this);
			return [ renderedArgs.join(joinToken) ];
		}
		let target = args[1];
		if (target) {
			if (target._renderUrl) {
				// detected nested query, and render the url inside as an argument
				target = '(' + target._renderUrl() + ')';
			} else if (target instanceof Array) {
				target = '(' + target + ')';
			}
		}
		const encodedFilterArg = encodeURIComponent(args[0]);
		const encodedFilterType = (type === 'eq' ? '' : type + '=');
		const encodedTarget = encodeURIComponent(target);
		return [ encodedFilterArg + '=' + encodedFilterType + encodedTarget ];
	}

	protected _renderQueryParams(): string[] {
		const queryParams: string[] = [];

		this.queryLog.forEach(function (entry: dstore.QueryLogEntry<any>) {
			const type = entry.type,
				renderMethod = '_render' + type[0].toUpperCase() + type.substr(1) + 'Params';

			if (this[renderMethod]) {
				push.apply(queryParams, this[renderMethod].apply(this, entry.normalizedArguments));
			} else {
				console.warn('Unable to render query params for "' + type + '" query', entry);
			}
		}, this);

		return queryParams;
	}

	/**
	 * Applies a Range header if this collection incorporates a range query
	 *
	 * @param start The start of the range
	 * @param end The end of the range
	 * @return The headers to which a Range property is added
	 */
	protected _renderRangeHeaders(start: number, end: number): { Range: string; 'X-Range': string } {
		const value = 'items=' + start + '-' + (end - 1);
		return {
			'Range': value,
			'X-Range': value // set X-Range for Opera since it blocks "Range" header
		};
	}

	/**
	 * Constructs range-related params to be inserted in the query string
	 *
	 * @param start The beginning of the range
	 * @param end The end of the range
	 * @return Range-related params to be inserted in the query string
	 */
	protected _renderRangeParams(start: number, end: number): string[] {
		const params: string[] = [];
		if (this.rangeStartParam) {
			params.push(
				this.rangeStartParam + '=' + start,
				this.rangeCountParam + '=' + (end - start)
			);
		} else {
			params.push('limit(' + (end - start) + (start ? (',' + start) : '') + ')');
		}
		return params;
	}

	/**
	 * Constructs select-related params to be inserted in the query string
	 *
	 * @param properties Select-related params to be inserted in the query string
	 * @return The rendered query string
	 */
	protected _renderSelectParams(properties: string): string[] {
		const params: string[] = [];
		if (this.selectParam) {
			params.push(this.selectParam + '=' + properties);
		} else {
			params.push('select(' + properties + ')');
		}
		return params;
	}

	/**
	 * Constructs sort-related params to be inserted in the query string
	 *
	 * @param sort An array of sort options indicating to render as a query string
	 * @return Sort-related params to be inserted in the query string
	 */
	protected _renderSortParams(sort: dstore.SortOption[]): string[] {
		const sortString = sort.map(function (sortOption: dstore.SortOption) {
			const prefix = sortOption.descending ? this.descendingPrefix : this.ascendingPrefix;
			return prefix + encodeURIComponent(sortOption.property);
		}, this);

		const params: string[] = [];
		params.push(this.sortParam
				? encodeURIComponent(this.sortParam) + '=' + sortString
				: 'sort(' + sortString + ')'
		);
		return params;
	}

	/**
	 * Constructs the URL used to fetch the data.
	 *
	 * @param requestParams A string or array of params to be rendered in the URL
	 * @return The URL of the data
	 */
	protected _renderUrl(requestParams: string | string[]): string {
		const queryParams = this._renderQueryParams();
		let requestUrl = this.target;

		if (requestParams) {
			push.apply(queryParams, requestParams);
		}

		if (queryParams.length > 0) {
			requestUrl += (this._targetContainsQueryString ? '&' : '?') + queryParams.join('&');
		}
		return requestUrl;
	}

	protected _request(kwArgs: dstore.FetchArgs = {}): RequestResponse<T> {
		// perform the actual query
		const headers = <Hash<string>> lang.mixin(Object.create(this.headers), { Accept: this.accepts });

		if ('headers' in kwArgs) {
			lang.mixin(headers, kwArgs.headers);
		}

		const requestUrl = this._renderUrl(kwArgs.queryParams);

		const response = request(requestUrl, {
			method: 'GET',
			headers: headers
		});

		const parsedResponse = response.then((response: Response<string>) => {
			return this.parse(response.data);
		});
		return {
			data: parsedResponse.then((data) => {
				// support items in the results
				const results = data.items || data;
				for (let i = 0, l = results.length; i < l; i++) {
					results[i] = this._restore(results[i], true);
				}
				return results;
			}),
			total: parsedResponse.then(function (data) {
				// check for a total property
				const total = data.total;
				if (total > -1) {
					// if we have a valid positive number from the data,
					// we can use that
					return total;
				}
				// else use headers
				return response.then(function (response) {
					const rangeHeader = response.getHeader('Content-Range');
					let rangeMatch = rangeHeader ? rangeHeader.match(/\/(.*)/) : null;
					return rangeMatch ? Number(rangeMatch[1]) : null;
				});
			}),
			response: response
		};
	}

	fetch(kwArgs?: dstore.FetchArgs) {
		const results = this._request(kwArgs);
		return <dstore.FetchPromise<T>> QueryResults(results.data, {
			response: results.response
		});
	}

	fetchRange(kwArgs: dstore.FetchRangeArgs) {
		const start = kwArgs.start;
		const end = kwArgs.end;
		const requestArgs: dstore.FetchArgs = {};

		if (this.useRangeHeaders) {
			requestArgs.headers = lang.mixin(this._renderRangeHeaders(start, end), kwArgs.headers);
		} else {
			requestArgs.queryParams = this._renderRangeParams(start, end);
			if (kwArgs.headers) {
				requestArgs.headers = kwArgs.headers;
			}
		}

		const results = this._request(requestArgs);
		return <dstore.FetchPromise<T>> QueryResults<T>(results.data, {
			totalLength: results.total,
			response: results.response
		});
	}

	parse(data: string) {
		// Defaults to JSON, but other formats can be parsed by providing an alternate
		// parsing function. If you do want to use an alternate format, you will probably
		// want to use an alternate stringify function for the serialization of data as well.
		// Also, if you want to support parsing a larger set of JavaScript objects
		// outside of strict JSON parsing, you can provide dojo/_base/json.fromJson as the parse function
		return JSON.parse(data);
	}
}

export default Request;
