define([
	'intern!object',
	'intern/chai!assert',
	'dojo/Deferred',
	'dojo/when',
	'dojo/json',
	'dojo/aspect',
	'dojo/_base/declare',
	'dstore/Store',
	'dstore/Memory',
	'dstore/Request',
	'./mockRequest',
	'dstore/Cache'
], function (registerSuite, assert, Deferred, when, JSON, aspect, declare, Store, Memory, Request, mockRequest, Cache) {

	/* jshint newcap: false */
	var masterFilterCalled;
	var Master = declare(Memory, {
		filter: function () {
			masterFilterCalled = true;
			return this.inherited(arguments);
		}
	});
	function makeDeferred(){
		return function () {
			var result = this.inherited(arguments);
			var deferred = new Deferred();
			setTimeout(function () {
				deferred.resolve(result);
			});
			return deferred.promise;
		};
	}
	var AsyncMemory = declare(Memory, {
		fetch: makeDeferred(),
		get: makeDeferred(),
		put: makeDeferred(),
		remove: makeDeferred()
	});
	var AsyncMaster = declare([AsyncMemory, Master], {});
	function createTests(name, Master, cachingStore){
		var store; 
		return {
			setup: function () {
				store = new declare([Master, Cache])({
					cachingStore: cachingStore,
					data: [
						{id: 1, name: 'one', prime: false},
						{id: 2, name: 'two', even: true, prime: true},
						{id: 3, name: 'three', prime: true},
						{id: 4, name: 'four', even: true, prime: false},
						{id: 5, name: 'five', prime: true}
					]
				});
			},
			name: name,

			'get': function () {
				return when(store.get(1)).then(function (object) {
					assert.strictEqual(object.name, 'one');
					return cachingStore.get(1);
				}).then(function (object) {
					assert.strictEqual(object.name, 'one'); // second one should be cached
					return store.get(1);
				}).then(function (object) {
					assert.strictEqual(object.name, 'one');
					return store.get(4);
				}).then(function (object) {
					assert.strictEqual(object.name, 'four');
					return cachingStore.get(4);
				}).then(function (object) {
					assert.strictEqual(object.name, 'four');
					return store.get(4);
				}).then(function (object) {
					assert.strictEqual(object.name, 'four');
				});
			},

			'filter': function () {
				store.isLoaded = store.canCacheQuery = function () {
					return false;
				};

				var collection = store.filter({prime: true});
				return when(collection.fetch()).then(function (results) {
					assert.strictEqual(results.length, 3);
					return collection.cachingStore.get(3);
				}).then(function (result) {
					assert.strictEqual(result, undefined);
					collection = store.filter({even: true});
					return collection.fetch();
				}).then(function (results) {
					assert.strictEqual(results[1].name, 'four');
					store.isLoaded = store.canCacheQuery = function () {
						return true;
					};
					collection = store.filter({prime: true});
					return collection.fetch();
				}).then(function (results) {
					assert.strictEqual(results.length, 3);
					return collection.cachingStore.get(3);
				}).then(function (result) {
					assert.strictEqual(result.name, 'three');
				});
			},

			'filter with sort': function () {
				return when(store.filter({prime: true}).sort('name').fetch()).then(function (results) {
					assert.strictEqual(results.length, 3);
					return store.filter({even: true}).sort('name').fetch();
				}).then(function (results) {
					assert.strictEqual(results[1].name, 'two');
				});
			},

			'put update': function () {
				return when(store.get(4)).then(function (four) {
					four.square = true;
					return store.put(four);
				}).then(function () {
					return store.get(4);
				}).then(function (four) {
					assert.isTrue(four.square);
					return cachingStore.get(4);
				}).then(function (four) {
					assert.isTrue(four.square);
					return store.get(4);
				}).then(function (four) {
					assert.isTrue(four.square);
				});
			},

			'put new': function () {
				return when(store.put({
					id: 6,
					perfect: true
				})).then(function () {
					return store.get(6);
				}).then(function (six) {
					assert.isTrue(six.perfect);
					return cachingStore.get(6);
				}).then(function (six) {
					assert.isTrue(six.perfect);
				});
			},

			'add duplicate': function () {
				var threw;
				try {
					return when(store.add({
						id: 6,
						perfect: true
					})).then(function () {
						assert.fail('Should not succeed');
					});
				} catch (e) {
					threw = true;
				}
				assert.isTrue(threw);
			},

			'add new': function () {
				return when(store.add({
					id: 7,
					prime: true
				})).then(function () {
					return store.get(7);	
				}).then(function (seven) {
					assert.isTrue(seven.prime);
					return cachingStore.get(7);
				}).then(function (seven) {
					assert.isTrue(seven.prime);
				});
			},

			'cached filter': function () {
				return when(store.fetch()).then(function () { // should result in everything being cached
					masterFilterCalled = false;
					return store.filter({prime: true}).fetch();
				}).then(function (results) {
					assert.strictEqual(results.length, 3);
					assert.isFalse(masterFilterCalled);
				});
			},
			'defaults to queryEngine of the cachingStore': function () {
				var store = new (declare([ Store, Cache ]))({
					cachingStore: new Memory()
				});

				assert.property(store.cachingStore, 'queryEngine');
				assert.strictEqual(store.queryEngine, store.cachingStore.queryEngine);
			}
		};
	}
	registerSuite(createTests('dstore Cache', Master, new Memory()));
	registerSuite(createTests('dstore Cache with async Master', AsyncMaster, new Memory()));
	registerSuite(createTests('dstore Cache with both async', AsyncMaster, new AsyncMemory()));
});
