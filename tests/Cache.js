define([
	'intern!object',
	'intern/chai!assert',
	'dojo/Deferred',
	'dojo/_base/declare',
	'dstore/Memory',
	'dstore/Cache',
	'dstore/util/QueryResults'
], function(registerSuite, assert, Deferred, declare, Memory, Cache, QueryResults){

	var cachingStore = new Memory();
	var store = new declare([Memory, Cache])({
		cachingStore: cachingStore,
		data: [
			{id: 1, name: 'one', prime: false},
			{id: 2, name: 'two', even: true, prime: true},
			{id: 3, name: 'three', prime: true},
			{id: 4, name: 'four', even: true, prime: false},
			{id: 5, name: 'five', prime: true}
		]
	});

	registerSuite({
		name: 'dstore Cache',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(cachingStore.get(1).name, 'one'); // second one should be cached
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.strictEqual(cachingStore.get(4).name, 'four');
			assert.strictEqual(store.get(4).name, 'four');
		},

		'filter': function(){
			options.isLoaded = function(){
				return false;
			};
			assert.strictEqual(store.filter({prime: true}).length, 3);
			assert.strictEqual(store.filter({even: true})[1].name, 'four');
			assert.strictEqual(cachingStore.get(3), undefined);
			options.isLoaded = function(){
				return true;
			};
			assert.strictEqual(store.filter({prime: true}).length, 3);
			assert.strictEqual(cachingStore.get(3).name, 'three');
		},

		'filter with sort': function(){
			assert.strictEqual(store.filter({prime: true}, {sort: [
				{attribute: 'name'}
			]}).length, 3);
			assert.strictEqual(store.filter({even: true}, {sort: [
				{attribute: 'name'}
			]})[1].name, 'two');
		},

		'put update': function(){
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
			four = cachingStore.get(4);
			assert.isTrue(four.square);
			four = masterStore.get(4);
			assert.isTrue(four.square);
		},

		'put new': function(){
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.get(6).perfect);
			assert.isTrue(cachingStore.get(6).perfect);
			assert.isTrue(masterStore.get(6).perfect);
		},

		'add duplicate': function(){
			var threw;
			try{
				store.add({
					id: 6,
					perfect: true
				});
			}catch(e){
				threw = true;
			}
			assert.isTrue(threw);
		},

		'add new': function(){
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.get(7).prime);
			assert.isTrue(cachingStore.get(7).prime);
			assert.isTrue(masterStore.get(7).prime);
		},

		'results from master': function(){
			var originalAdd = masterStore.add;
			masterStore.add = function(){
				return {
					test: 'value'
				};
			};
			assert.strictEqual(store.add({
				id: 7,
				prop: 'doesn\'t matter'
			}).test, 'value');
			masterStore.add = originalAdd;
		},

		'cached filter': function(){
			store.filter(); // should result in everything being cached
			/*masterStore.filter = function(){
				throw new Error('should not be called');
			};*/
			assert.strictEqual(store.filter({prime: true}).length, 4);
		},

		'delayed cached filter': function(){
			var masterStore = {
				filter: function(){
					var def = new Deferred();
					setTimeout(function(){
						def.resolve([
							{id: 1, name: 'one', prime: false},
							{id: 2, name: 'two', even: true, prime: true},
							{id: 3, name: 'three', prime: true},
							{id: 4, name: 'four', even: true, prime: false},
							{id: 5, name: 'five', prime: true}
						]);
					}, 20);
					return new QueryResults(def);
				}
			};
			var cachingStore = new Memory();
			var options = {};
			var store = Cache(masterStore, cachingStore, options);
			store.filter(); // should result in everything being cached
			/*masterStore.query = function(){
				throw new Error('should not be called');
			};*/
			var testDef = new Deferred();
			store.filter({prime: true}).then(function(results){
				assert.strictEqual(results.length, 3);
				testDef.resolve(true);
			});
			return testDef;
		}
	});
});
