define([
	'require',
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/store/JsonRest',
	'dstore/legacy/StoreAdapter'
], function(require, registerSuite, assert, declare, lang, JsonRest, StoreAdapter){
	// NOTE: Because HTTP headers are case-insensitive they should always be provided as all-lowercase
	// strings to simplify testing.
	function runTest(method, args, store){
		var d = this.async();
		store[method].apply(store, args).then(d.callback(function(result){
			var k;
			var resultHeaders = result.headers;
			for(k in requestHeaders){
				if(resultHeaders.hasOwnProperty(k)){
					assert.strictEqual(resultHeaders[k], requestHeaders[k]);
				}
			}

			for(k in globalHeaders){
				if(resultHeaders.hasOwnProperty(k)){
					assert.strictEqual(resultHeaders[k], globalHeaders[k]);
				}
			}
		}), lang.hitch(d, 'reject'));
	}

	var globalHeaders = {

		'test-global-header-a': 'true',
		'test-global-header-b': 'yes'
	};
	var requestHeaders = {
		'test-local-header-a': 'true',
		'test-local-header-b': 'yes',
		'test-override': 'overridden'
	};
	var legacyStore = new JsonRest({
		target: require.toUrl('dstore/tests/x.y').match(/(.+)x\.y$/)[1],
		headers: lang.mixin({ 'test-override': false }, globalHeaders),
		remove: function(id){
			var result = this.inherited(arguments);
			return result.then(function(response){
				return response && JSON.parse(response);
			});
		}
	});
	var adaptedStore = StoreAdapter.adapt(legacyStore, {
	});
	adaptedStore.model.prototype.describe = function(){
		return 'name is ' + this.name;
	};
	

	var	store  = new (declare([JsonRest, StoreAdapter]))({
		target: require.toUrl('dstore/tests/x.y').match(/(.+)x\.y$/)[1],
		headers: lang.mixin({ 'test-override': false }, globalHeaders),
		remove: function(id){
			var result = this.inherited(arguments);
			return result.then(function(response){
				return response && JSON.parse(response);
			});
		}
	});
	store.model.prototype.describe = function(){
		return 'name is ' + this.name;
	};

	registerSuite({
		name: 'legacy dojo/store adapter - JsonRest',

		'get': function(){
			var d = this.async();
			store.get('data/node1.1').then(d.callback(function(object){
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
				assert.strictEqual(store.getIdentity(object), 'node1.1');
			}));
		},

		'query': function(){
			var first = true;
			return store.filter('data/treeTestRoot').forEach(function(object){
				if(first){
					first = false;
					assert.strictEqual(object.name, 'node1');
					assert.strictEqual(object.describe(), 'name is node1');
					assert.strictEqual(object.someProperty, 'somePropertyA');
				}
			});
		},

		'query iterative': function(){
			var d = this.async();
			var i = 0;
			return store.filter('data/treeTestRoot').forEach(d.rejectOnError(function(object){
				i++;
				assert.strictEqual(object.name, 'node' + i);
			}));
		},

		'headers get 1': function(){
			runTest.call(this, 'get', [ 'index.php', requestHeaders ], store);
		},

		'headers get 2': function(){
			runTest.call(this, 'get', [ 'index.php', { headers: requestHeaders } ], store);
		},

		'headers remove': function(){
			runTest.call(this, 'remove', [ 'index.php', { headers: requestHeaders } ], store);
		},

		'headers put': function(){
			runTest.call(this, 'put', [
				{},
				{ headers: requestHeaders }
			], store);
		},

		'headers add': function(){
			runTest.call(this, 'add', [
				{},
				{ headers: requestHeaders }
			], store);
		}
	});

	registerSuite({
		name: 'legacy dojo/store adapter - JsonRest - adapted obj',

		'get': function(){
			var d = this.async();
			adaptedStore.get('data/node1.1').then(d.callback(function(object){
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
				assert.strictEqual(adaptedStore.getIdentity(object), 'node1.1');
			}));
		},

		'query': function(){
			var first = true;
			return adaptedStore.filter('data/treeTestRoot').forEach(function(object){
				if(first){
					first = false;
					assert.strictEqual(object.name, 'node1');
					assert.strictEqual(object.describe(), 'name is node1');
					assert.strictEqual(object.someProperty, 'somePropertyA');
				}
			});
		},

		'query iterative': function(){
			var d = this.async();
			var i = 0;
			return adaptedStore.filter('data/treeTestRoot').forEach(d.rejectOnError(function(object){
				i++;
				assert.strictEqual(object.name, 'node' + i);
			}));
		},

		'headers get 1': function(){
			runTest.call(this, 'get', [ 'index.php', requestHeaders ], adaptedStore);
		},

		'headers get 2': function(){
			runTest.call(this, 'get', [ 'index.php', { headers: requestHeaders } ], adaptedStore);
		},

		'headers remove': function(){
			runTest.call(this, 'remove', [ 'index.php', { headers: requestHeaders } ], adaptedStore);
		},

		'headers put': function(){
			runTest.call(this, 'put', [
				{},
				{ headers: requestHeaders }
			], adaptedStore);
		},

		'headers add': function(){
			runTest.call(this, 'add', [
				{},
				{ headers: requestHeaders }
			], adaptedStore);
		}
	});
});
