import { Hash } from 'dojo-core/interfaces';
import * as lang from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
import request from 'dojo-core/request';
import * as dstore from './interfaces';
import Request, { RequestStoreArgs } from './Request'; /*========, './Store' =========*/

/*=====
 var __HeaderOptions = {
 // headers: Object?
 //		Additional headers to send along with the request.
 },
 __PutDirectives = declare(Store.PutDirectives, __HeaderOptions),
 =====*/
export default class Rest<T> extends Request<T> implements dstore.Collection<T> {

	defaultNewToStart: boolean;

	constructor(args: RequestStoreArgs) {
		super(args);
	}

	/**
	 * If the target has no trailing '/', then append it.
	 *
	 * @param id The identity of the requested target
	 * @return The target with a trailing '/' appended if it
	 * didn't have one
	 */
	protected _getTarget(id: string | number): string {
		const target = this.target;
		if (target.slice(-1) === '/') {
			return target + id;
		} else {
			return target + '/' + id;
		}
	}

	add(object: T, options?: dstore.PutDirectives) {
		options = options || {};
		options.overwrite = false;
		return this.put(object, options);
	}

	get(id: string | number, options?: { [ name: string ]: any }): Promise<T> {
		options = options || {};
		const headers = <Hash<string>> lang.mixin({ Accept: this.accepts }, this.headers, options['headers'] || options);
		const store = this;
		return request<string>(this._getTarget(id), {
			headers: headers
		}).then(function (response) {
			return store._restore(store.parse(response.data), true);
		});
	}

	put(object: any, options?: dstore.PutDirectives) {
		options = options || <dstore.PutDirectives> {};
		const id = ('id' in options) ? options.id : this.getIdentity(object);
		const hasId = typeof id !== 'undefined';
		const store = this;

		const positionHeaders = 'beforeId' in options
			? (options.beforeId === null
			? { 'Put-Default-Position': 'end' }
			: { 'Put-Before': options.beforeId })
			: (!hasId || options.overwrite === false
			? { 'Put-Default-Position': (this.defaultNewToStart ? 'start' : 'end') }
			: null);

		const initialResponse = request<string>(hasId ? this._getTarget(id) : this.target, {
			method: hasId && !options.incremental ? 'PUT' : 'POST',
			data: this.stringify(object),
			headers: <Hash<string>> lang.mixin({
				'Content-Type': 'application/json',
				Accept: this.accepts,
				'If-Match': options.overwrite === true ? '*' : null,
				'If-None-Match': options.overwrite === false ? '*' : null
			}, positionHeaders, this.headers, options.headers)
		});
		return initialResponse.then(function (response) {
			const event = <dstore.ChangeEvent<T>> {};

			if ('beforeId' in options) {
				event.beforeId = options.beforeId;
			}

			const result = event.target = response && store._restore(store.parse(response.data), true) || object;

			event.type = response.statusCode === 201 ? 'add' : 'update';
			store.emit(event);

			return result;
		});
	}

	/**
	 * Extends the remove function provided by Store to allow
	 * for optional header options
	 * @param id
	 * @param options
	 * @returns Promise<T | void> A promise that resolves to either the object
	 * removed or void.
	 */
	remove(id: string | number, options?: Hash<any>) {
		options = options || {};
		const store = this;
		return request<string>(this._getTarget(id), {
			method: 'DELETE',
			headers: <Hash<string>> lang.mixin({}, this.headers, options['headers'])
		}).then(function (response) {
			const target = response && store.parse(response.data);
			store.emit({ type: 'delete', id: id, target: target });
			return response ? target : true;
		});
	}

	/**
	 * This function performs the serialization of the data for requests to the server. This
	 * defaults to JSON, but other formats can be serialized by providing an alternate
	 * stringify function. If you do want to use an alternate format, you will probably
	 * want to use an alternate parse function for the parsing of data as well.
	 */
	stringify(arg: any) {
		return JSON.stringify(arg);
	}
}
