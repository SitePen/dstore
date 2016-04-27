import Promise from 'dojo-core/Promise';
import query_results from './query-results';

function when(valueOrPromise: any, callback?: (value: any) => any) {
	let receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";

	if(!receivedPromise){
		if(arguments.length > 1){
			return callback ? callback(valueOrPromise) : valueOrPromise;
		}else{
			return new Promise((resolve, reject) => {
				resolve(valueOrPromise);
			});
		}
	}

	if(callback){
		return valueOrPromise.then(callback);
	}
	return valueOrPromise;
}

function promised(method: string, query?: any) {
	return function(...args: any[]) {
		let promise = new Promise((resolve, reject) => {
			resolve(this[method](args));
		});
		if (query) {
			// need to create a QueryResults and ensure the totalLength is
			// a promise.
			var queryResults = query_results(promise);
			queryResults.totalLength = when(queryResults.totalLength);
			return queryResults;
		}
		return promise;
	};
}

export let get = promised('getSync');
export let put = promised('putSync');
export let add = promised('addSync');
export let remove = promised('removeSync');
export let fetch = promised('fetchSync', true);
export let fetchRange = promised('dddd', false);