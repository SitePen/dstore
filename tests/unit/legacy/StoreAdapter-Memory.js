define([
	'dojo/_base/declare',
	'intern!object',
	'intern/chai!assert',
	'dojo/store/Memory',
	'dojo/promise/all',
	'../sorting',
	'src/legacy/StoreAdapter'
], function (declare, registerSuite, assert, Memory, all, sorting, StoreAdapter) {

	var Model = function () {};

	function getResultsArray(store) {
		var results = [];
		return store.forEach(function (data) {
			results.push(data);
		}).then(function() {
			return results;
		});
	}

	var store;

	registerSuite({
		name: 'legacy dstore adapter - Memory',

		beforeEach: function () {
			store = new StoreAdapter({
				objectStore: new Memory({
					data: [
						{id: 1, name: 'one', prime: false, mappedTo: 'E'},
						{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D'},
						{id: 3, name: 'three', prime: true, mappedTo: 'C'},
						{id: 4, name: 'four', even: true, prime: false, mappedTo: null},
						{id: 5, name: 'five', prime: true, mappedTo: 'A'}
					]
				}),
				Model: Model
			});
			store.Model.prototype.describe = function () {
				return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
			};
		},

		'get': function () {
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
			assert.strictEqual(store.getIdentity(store.get(1)), 1);
		},

		'Model': function () {
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			return getResultsArray(store.filter({even: true})).then(function (results) {
				assert.strictEqual(results.length, 2, 'The length is 2');
				assert.strictEqual(results[1].describe(), 'four is not a prime');
			});
		},

		fetch: function () {
			var totalLength = store.fetch().totalLength;
			assert.isDefined(totalLength, 'totalLength should be defined on fetch results');
			assert.strictEqual(typeof totalLength.then, 'function',
				'totalLength should be a promise');
		},

		'filter': function () {
			return all([
				getResultsArray(store.filter({prime: true})),
				getResultsArray(store.filter({even: true}))
			]).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 3);
				assert.strictEqual(resultsArray[1][1].name, 'four');
			});
		},

		'filter with string': function () {
			return all([
				getResultsArray(store.filter({name: 'two'})),
				getResultsArray(store.filter({name: 'two'}))
			]).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 1);
				assert.strictEqual(resultsArray[1][0].name, 'two');
			});
		},

		'filter with regexp': function () {
			return all([
				getResultsArray(store.filter({name: /^t/})),
				getResultsArray(store.filter({name: /^t/})),
				getResultsArray(store.filter({name: /^o/})),
				getResultsArray(store.filter({name: /o/}))
			]).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 2);
				assert.strictEqual(resultsArray[1][1].name, 'three');
				assert.strictEqual(resultsArray[2].length, 1);
				assert.strictEqual(resultsArray[3].length, 3);
			});
		},

		'filter with test function': function () {
			return all([
				getResultsArray(store.filter({id: {test: function (id) {
					return id < 4;
				}}})),
				getResultsArray(store.filter({even: {test: function (even, object) {
					return even && object.id > 2;
				}}}))
			]).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 3);
				assert.strictEqual(resultsArray[1].length, 1);
			});
		},

		'filter with sort': function () {
			return all([
				getResultsArray(store.filter({prime: true}).sort('name')),
				getResultsArray(store.filter({even: true}).sort('name')),
				getResultsArray(store.filter({even: true}).sort(function (a, b) {
					return a.name < b.name ? -1 : 1;
				})),
				getResultsArray(store.filter(null).sort('mappedTo'))
			]).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 3);
				assert.strictEqual(resultsArray[1][1].name, 'two');
				assert.strictEqual(resultsArray[2][1].name, 'two');
				assert.strictEqual(resultsArray[3][4].name, 'four');
			});
		},

		'filter with paging': function () {
			return all([
				store.filter({ even: true }).fetchRange({ start: 1, end: 2 }).then(function (results) {
					assert.strictEqual(results[0].name, 'four');
				}),
				store.filter({ prime: true }).fetchRange({ start: 1, end: 2 }).then(function (results) {
					assert.strictEqual(results.length, 1);
				})
			]);
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
			return all([
				getResultsArray(store.filter({prime: true})),
				getResultsArray(store.filter({perfect: true}))
			]).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 4);
				assert.strictEqual(resultsArray[1].length, 0);
				store.remove(3);
				store.put({ id: 6, perfect: true });
				return all([
					getResultsArray(store.filter({prime: true})),
					getResultsArray(store.filter({perfect: true}))
				]);
			}).then(function (resultsArray) {
				assert.strictEqual(resultsArray[0].length, 3);
				assert.strictEqual(resultsArray[1].length, 1);
			});
		},

		'ItemFileReadStore style data': function () {
			var anotherLegacy = new Memory({
				data: {
					items: [
						{name: 'one', prime: false},
						{name: 'two', even: true, prime: true},
						{name: 'three', prime: true}
					],
					identifier: 'name'
				}
			});
			var anotherStore = new StoreAdapter({ objectStore: anotherLegacy });

			assert.strictEqual(anotherStore.get('one').name, 'one');
			assert.strictEqual(anotherStore.getIdentity(anotherStore.get('one')), 'one');
			return getResultsArray(anotherStore.filter({name: 'one'})).then(function (results) {
				assert.strictEqual(results[0].name, 'one');
			});
		},

		'add new id assignment': function () {
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		},

		nestedSuite: sorting('legacy dstore adapter sorting - dojo/store/Memory', function before(data) {
			return function before() {
				var legacyStore = new Memory({data: data});
				store = new StoreAdapter({ objectStore: legacyStore });
			};
		}, function sort() {
			return store.sort.apply(store, arguments).fetch();
		})
	});
});
