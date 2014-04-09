define([
	'dojo/_base/declare',
	'dojo/Deferred',
	'dojo/data/ItemFileReadStore',
	'dojo/store/DataStore',
	'intern!object',
	'intern/chai!assert',
	'dojo/store/Memory',
	'../sorting',
	'dstore/legacy/StoreAdapter',
	'../data/testData'
], function (declare, Deferred, ItemFileReadStore, DataStore, registerSuite, assert, Memory, sorting, StoreAdapter, testData) {

	var store;

	registerSuite({
		name: 'legacy dstore adapter - dojo data',

		beforeEach: function () {
			var dataStore = new DataStore({
				store: new ItemFileReadStore({
					data: testData
				})
			});
			store = StoreAdapter.adapt(dataStore);
			store.model.prototype.describe = function () {
				return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
			};
		},

		'get': function () {
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
			assert.strictEqual(store.getIdentity(store.get(1)), 1);
		},

		'model': function () {
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			var results = store.filter({even: true}).fetch();
			assert.strictEqual(results.length, 2, 'The length is 2');
			assert.strictEqual(results[1].describe(), 'four is not a prime');
		},

		'filter': function () {
			assert.strictEqual(store.filter({prime: true}).fetch().length, 3);
			assert.strictEqual(store.filter({even: true}).fetch()[1].name, 'four');
		},

		'filter with string': function () {
			assert.strictEqual(store.filter({name: 'two'}).fetch().length, 1);
			assert.strictEqual(store.filter({name: 'two'}).fetch()[0].name, 'two');
		},

		'filter with regexp': function () {
			assert.strictEqual(store.filter({name: /^t/}).fetch().length, 2);
			assert.strictEqual(store.filter({name: /^t/}).fetch()[1].name, 'three');
			assert.strictEqual(store.filter({name: /^o/}).fetch().length, 1);
			assert.strictEqual(store.filter({name: /o/}).fetch().length, 3);
		},

		'filter with test function': function () {
			assert.strictEqual(store.filter({id: {test: function (id) {
				return id < 4;
			}}}).fetch().length, 3);
			assert.strictEqual(store.filter({even: {test: function (even, object) {
				return even && object.id > 2;
			}}}).fetch().length, 1);
		},

		'filter with sort': function () {
			assert.strictEqual(store.filter({prime: true}).sort('name').fetch().length, 3);
			assert.strictEqual(store.filter({even: true}).sort('name').fetch()[1].name, 'two');
			assert.strictEqual(store.filter({even: true}).sort(function (a, b) {
				return a.name < b.name ? -1 : 1;
			}).fetch()[1].name, 'two');
			assert.strictEqual(store.filter(null).sort('mappedTo').fetch()[4].name, 'four');
		},

		'filter with paging': function () {
			assert.strictEqual(store.filter({prime: true}).range(1, 2).fetch().length, 1);
			assert.strictEqual(store.filter({even: true}).range(1, 2).fetch()[0].name, 'four');
		},

		'put update': function () {
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
		},

		'put new': function () {
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.get(6).perfect);
		},

		'add duplicate': function () {
			var threw;
			try {
				store.add({
					id: 5,
					perfect: true
				});
			} catch (e) {
				threw = true;
			}
			assert.isTrue(threw);
		},

		'add new': function () {
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.get(7).prime);
		},

		'remove': function () {
			assert.isTrue(store.remove(3));
			assert.strictEqual(store.get(3), undefined);
		},

		'remove missing': function () {
			assert(!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.get(1).id, 1);
		},

		'filter after changes': function () {
			store.add({ id: 7, prime: true });
			assert.strictEqual(store.filter({prime: true}).fetch().length, 4);
			assert.strictEqual(store.filter({perfect: true}).fetch().length, 0);
			store.remove(3);
			store.put({ id: 6, perfect: true });
			assert.strictEqual(store.filter({prime: true}).fetch().length, 3);
			assert.strictEqual(store.filter({perfect: true}).fetch().length, 1);
		},

		'add new id assignment': function () {
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		}
	});
});
