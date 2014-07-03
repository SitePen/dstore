define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'./sorting',
	'dstore/Model',
	'dstore/Memory'
], function (registerSuite, assert, declare, sorting, Model, Memory) {

	var store;

	registerSuite({
		name: 'dstore Memory',

		beforeEach: function () {
			store = new Memory({
				data: [
					{ id: 1, name: 'one', prime: false, mappedTo: 'E' },
					{ id: 2, name: 'two', even: true, prime: true, mappedTo: 'D' },
					{ id: 3, name: 'three', prime: true, mappedTo: 'C' },
					{ id: 4, name: 'four', even: true, prime: false, mappedTo: null },
					{ id: 5, name: 'five', prime: true, mappedTo: 'A' }
				],
				model: Model
			});

			// add a method to the model prototype
			store.model.prototype.describe = function () {
				return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
			};
		},

		'getSync': function () {
			assert.strictEqual(store.getSync(1).name, 'one');
			assert.strictEqual(store.getSync(4).name, 'four');
			assert.isTrue(store.getSync(5).prime);
		},
		'get': function () {
			return store.get(1).then(function (object) {
				assert.strictEqual(object.name, 'one');
			});
		},

		'model': function () {
			assert.strictEqual(store.getSync(1).describe(), 'one is not a prime');
			assert.strictEqual(store.getSync(3).describe(), 'three is a prime');
			assert.strictEqual(store.filter({even: true}).fetchSync()[1].describe(), 'four is not a prime');
		},

		'no model': function() {
			var noModelStore = new Memory({
				data: [
					{id: 1, name: 'one', prime: false, mappedTo: 'E'}
				],
				model: null
			});
			assert.strictEqual(noModelStore.getSync(1).get, undefined);
			assert.strictEqual(noModelStore.getSync(1).save, undefined);
		},

		'filter': function () {
			var filter = new store.Filter();
			assert.strictEqual(store.filter(filter.eq('prime', true)).fetchSync().length, 3);
			var count = 0;
			store.filter(filter.eq('prime', true)).fetch().forEach(function (object) {
				count++;
				assert.equal(object.prime, true);
			});
			assert.equal(count, 3);
			assert.strictEqual(store.filter({even: true}).fetchSync()[1].name, 'four');
		},

		'async filter': function () {
			var filter = new store.Filter();
			return store.filter(filter.eq('even', true)).fetch().then(function (results) {
				assert.strictEqual(results.length, 2);
			});
		},

		'filter with string': function () {
			assert.strictEqual(store.filter({name: 'two'}).fetchSync().length, 1);
			assert.strictEqual(store.filter({name: 'two'}).fetchSync()[0].name, 'two');
		},

		'filter with regexp': function () {
			assert.strictEqual(store.filter({name: /^t/}).fetchSync().length, 2);
			assert.strictEqual(store.filter({name: /^t/}).fetchSync()[1].name, 'three');
			assert.strictEqual(store.filter({name: /^o/}).fetchSync().length, 1);
			assert.strictEqual(store.filter({name: /o/}).fetchSync().length, 3);
		},

		'filter with or': function () {
			var filter = new store.Filter();
			var primeOrEven = filter.or(filter.eq('prime', true), filter.eq('even', true));
			assert.strictEqual(store.filter(primeOrEven).fetchSync().length, 4);
		},

		'filter with gt and lt': function () {
			var filter = new store.Filter();
			var betweenTwoAndFour = filter.gt('id', 2).lt('id', 5);
			assert.strictEqual(store.filter(betweenTwoAndFour).fetchSync().length, 2);
			var overTwo = {
				id: filter.gt(2)
			};
			assert.strictEqual(store.filter(overTwo).fetchSync().length, 3);
			var TwoToFour = filter.gte('id', 2).lte('id', 5);
			assert.strictEqual(store.filter(TwoToFour).fetchSync().length, 4);
		},

		'filter with test function': function () {
			assert.strictEqual(store.filter({id: {test: function (id) {
				return id < 4;
			}}}).fetchSync().length, 3);
			assert.strictEqual(store.filter({even: {test: function (even, object) {
				return even && object.id > 2;
			}}}).fetchSync().length, 1);
		},

		'filter with sort': function () {
			assert.strictEqual(store.filter({prime: true}).sort('name').fetchSync().length, 3);
			assert.strictEqual(store.filter({even: true}).sort('name').fetchSync()[1].name, 'two');
			assert.strictEqual(store.filter({even: true}).sort(function (a, b) {
				return a.name < b.name ? -1 : 1;
			}).fetchSync()[1].name, 'two');
			assert.strictEqual(store.filter(null).sort('mappedTo').fetchSync()[4].name, 'four');
		},

		'filter with paging': function () {
			assert.strictEqual(store.filter({prime: true}).fetchRangeSync({start: 1, end: 2}).length, 1);
			var count = 0;
			store.filter({prime: true}).fetchRange({start: 1, end: 2}).forEach(function (object) {
				count++;
				assert.equal(object.prime, true);
			});
			assert.equal(count, 1);
			assert.strictEqual(store.filter({prime: true}).fetchRangeSync({start: 1, end: 2}).totalLength, 3);
			assert.strictEqual(store.filter({even: true}).fetchRangeSync({start: 1, end: 2})[0].name, 'four');
		},

		'filter with inheritance': function () {
			var store = new Memory({
				data: [
					{id: 1, name: 'one', prime: false},
					{id: 2, name: 'two', even: true, prime: true}
				],
				getIdentity: function () {
					return 'id-' + this.inherited(arguments);
				},
				newMethod: function () {
					return 'hello';
				}
			});
			var filtered = store.filter({even: true}).sort('name');
			var one = filtered.getSync('id-1');
			one.changed = true;
			filtered.put(one);
			assert.strictEqual(filtered.getIdentity(one), 'id-1');
			assert.strictEqual(filtered.newMethod(), 'hello');
			store.remove('id-1');
			assert.strictEqual(filtered.getSync('id-1'), undefined);
		},

		'put update': function () {
			var four = store.getSync(4);
			four.square = true;
			store.put(four);
			four = store.getSync(4);
			assert.isTrue(four.square);
		},

		save: function () {
			var four = store.getSync(4);
			four.square = true;
			four.save();
			four = store.getSync(4);
			assert.isTrue(four.square);
		},

		'put new': function () {
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.getSync(6).perfect);
		},

		'put with options.beforeId': function () {
			// Make default put index 0 so it is clear beforeId:null is working
			store.defaultNewToStart = true;

			store.put({ id: 4 }, { beforeId: 3 });
			store.put({ id: 0 }, { beforeId: null });
			var results = store.fetchSync();
			assert.strictEqual(results[2].id, 4);
			assert.strictEqual(results[3].id, 3);
			assert.strictEqual(results[results.length - 1].id, 0);
		},

		'add with options.beforeId': function () {
			// Make default put index 0 so it is clear beforeId:null is working
			store.defaultNewToStart = true;

			store.add({ id: 42 }, { beforeId: 3 });
			store.add({ id: 24 }, { beforeId: null });
			var results = store.fetchSync();
			assert.strictEqual(results[2].id, 42);
			assert.strictEqual(results[3].id, 3);
			assert.strictEqual(results[results.length - 1].id, 24);
		},

		'create and remove': function () {
			var newObject = store.create({
				id: 10,
				name: 'ten'
			});
			assert.strictEqual(store.getSync(10), undefined);
			newObject.save();
			assert.isObject(store.getSync(10));
			newObject.remove();
			assert.strictEqual(store.getSync(10), undefined);
		},

		'add duplicate': function () {
			store.put({
				id: 6,
				perfect: true
			});

			var succeeded = false;
			store.add({
				id: 6,
				perfect: true
			}).then(function() {
				succeeded = true;
			}, function() {
				// should be rejected as a duplicate
			});
			assert.isFalse(succeeded);
		},

		'add new': function () {
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.getSync(7).prime);
		},

		'remove': function () {
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.removeSync(7));
			assert.strictEqual(store.getSync(7), undefined);
		},

		'remove from object': function () {
			var newObject = store.addSync({
				id: 7,
				prime: true
			});
			return newObject.remove().then(function (result) {
				assert.isTrue(result);
				assert.strictEqual(store.getSync(7), undefined);
			});
		},

		'remove missing': function () {
			var expectedLength = store.fetchSync().length;
			assert(!store.removeSync(77));
			// make sure nothing changed
			assert.strictEqual(store.fetchSync().length, expectedLength);
		},

		'put typed object': function () {
			function MyClass() {}
			var myObject = new MyClass();
			myObject.id = 10;
			store.put(myObject);
			// make sure we don't mess up the class of the input
			assert.isTrue(myObject instanceof MyClass);
			// make sure the the object in the store is the right type
			assert.isTrue(store.getSync(10) instanceof store.model);
		},

		'filter after changes': function () {
			store.remove(2);
			store.add({ id: 6, perfect: true });
			assert.strictEqual(store.filter({prime: true}).fetchSync().length, 2);
			assert.strictEqual(store.filter({perfect: true}).fetchSync().length, 1);
		},

		'ItemFileReadStore style data': function () {
			var anotherStore = new Memory({
				data: {

					items: [
						{name: 'one', prime: false},
						{name: 'two', even: true, prime: true},
						{name: 'three', prime: true}
					],
					identifier: 'name'
				}
			});
			assert.strictEqual(anotherStore.getSync('one').name, 'one');
			assert.strictEqual(anotherStore.filter({name: 'one'}).fetchSync()[0].name, 'one');
		},

		'add new id assignment': function () {
			var object = {
				random: true
			};
			object = store.addSync(object);
			assert.isTrue(!!object.id);
		},

		'total property': function () {
			var filteredCollection = store.filter(function (o) {
				return o.id <= 3;
			});

			var sortedCollection = store.sort('id');

			var ranged = store.fetchRangeSync({start: 0, end: 3});
			assert.strictEqual(ranged.totalLength, 5);
			assert.strictEqual(ranged.length, 3);
		},

		'composite key': function () {
			var store = new Memory({
				data: [
					{ x: 1, y: 1, name: '1,1' },
					{ x: 2, y: 1, name: '2,1' },
					{ x: 1, y: 2, name: '1,2' },
					{ x: 2, y: 2, name: '2,2' }
				],
				getIdentity: function (object) {
					return object.x + ',' + object.y;
				}
			});
			assert.equal(store.getSync('1,1').name, '1,1');
			assert.equal(store.getIdentity(store.getSync('1,2')), '1,2');
			store.add({x: 3, y: 2, name: '3,2'});
			assert.equal(store.getSync('3,2').name, '3,2');
			store.put({x: 1, y: 1, name: 'changed'});
			assert.equal(store.getSync('1,1').name, 'changed');
		},

		nestedSuite: sorting('dstore Memory sorting', function before(data) {
			return function before() {
				store = new Memory({data: data});
			};
		}, function sort() {
			return store.sort.apply(store, arguments).fetchSync();
		})

		// TODO: Add add, update, and remove event tests for Memory or develop a reusable suite
	});
});
