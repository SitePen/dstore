import {mixin} from 'dojo-core/lang';
import Promise from 'dojo-core/Promise';
// boodman/crockford delegation w/ cornford optimization
class TMP{}
function delegate(obj: any, props?: any): any{
	TMP.prototype = obj;
	let tmp = new TMP();
	TMP.prototype = null;
	if(props){
		mixin(tmp, props);
	}
	return tmp; // Object
}

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

function forEach(callback: (data: any, index?: number, all_data?: any[]) => any, instance: any) {
	return when(this, function(data) {
		for (let i = 0, l = data.length; i < l; i++){
			callback.call(instance, data[i], i, data);
		}
	});
}

export default function(data: any, options?: any){
	let hasTotalLength = options && 'totalLength' in options;
	if(data.then) {
		data = delegate(data);
		// a promise for the eventual realization of the totalLength, in
		// case it comes from the resolved data
		let totalLengthPromise = data.then((data: any) => {
			// calculate total length, now that we have access to the resolved data
			let totalLength = hasTotalLength ? options.totalLength :
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