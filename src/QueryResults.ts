import Promise from 'dojo-core/Promise';
import {duplicate} from 'dojo-core/lang';

export interface QueryOptions {
	totalLength?: number| Promise<number>;
	response: any;
}

export interface QueryResultsData<T> extends Array<T>, QueryOptions, Promise<T> {
}

function forEach<T>(callback:(value: T, index: number, source: T[]) => any, instance: any): Promise<void> {
	const execute = function (resolve: any, reject: any) {
		if (this.then) {
			this.then(resolve, reject);
		}
		else {
			resolve(this);
		}
	}.bind(this);

	return new Promise<Array<T>>(execute).then(function (data) {
		for (var i = 0, l = data.length; i < l; i++) {
			callback.call(instance, data[i], i, data);
		}
	});
}

export default class QueryResults {
	constructor(data: QueryResultsData<any>, options: QueryOptions) {
		var hasTotalLength = options && 'totalLength' in options;
		if (data.then) {
			data = <QueryResultsData<any>>duplicate(data);
			// a promise for the eventual realization of the totalLength, in
			// case it comes from the resolved data
			var totalLengthPromise = data.then(function (data: QueryResultsData<any>) {
				// calculate total length, now that we have access to the resolved data
				var totalLength = hasTotalLength ? options.totalLength :
				data.totalLength || data.length;
				// make it available on the resolved data
				data.totalLength = totalLength;
				// don't return the totalLength promise unless we need to, to avoid
				// triggering a lazy promise
				return !hasTotalLength && totalLength;
			});
			// make the totalLength available on the promise (whether through the options or the enventual
			// access to the resolved data)
			data.totalLength = hasTotalLength ? options.totalLength : totalLengthPromise;
			// make the response available as well
			data.response = options && options.response;
		} else {
			data.totalLength = hasTotalLength ? options.totalLength : data.length;
		}

		data.forEach = forEach;

		return data;
	}
}
