define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Memory'
], function(registerSuite, assert, declare, Memory){

	var store;

	function passThrough(object){ return object; }

	registerSuite({
		name: 'dstore Memory',

		beforeEach: function(){
			store = new Memory({
				data: [
					{id: 1, name: 'one', prime: false, mappedTo: 'E'},
					{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D'},
					{id: 3, name: 'three', prime: true, mappedTo: 'C'},
					{id: 4, name: 'four', even: true, prime: false, mappedTo: null},
					{id: 5, name: 'five', prime: true, mappedTo: 'A'}
				]
			});

			// add a method to the model prototype
			store.model.prototype.describe = function(){
				return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
			};
		},

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'model': function(){
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			assert.strictEqual(store.filter({even: true}).data[1].describe(), 'four is not a prime');
		},

		'query': function(){
			assert.strictEqual(store.filter({prime: true}).data.length, 3);
			assert.strictEqual(store.filter({even: true}).data[1].name, 'four');
		},

		'query with string': function(){
			assert.strictEqual(store.filter({name: 'two'}).data.length, 1);
			assert.strictEqual(store.filter({name: 'two'}).data[0].name, 'two');
		},

		'query with regexp': function(){
			assert.strictEqual(store.filter({name: /^t/}).data.length, 2);
			assert.strictEqual(store.filter({name: /^t/}).data[1].name, 'three');
			assert.strictEqual(store.filter({name: /^o/}).data.length, 1);
			assert.strictEqual(store.filter({name: /o/}).data.length, 3);
		},

		'query with test function': function(){
			assert.strictEqual(store.filter({id: {test: function(id){
				return id < 4;
			}}}).data.length, 3);
			assert.strictEqual(store.filter({even: {test: function(even, object){
				return even && object.id > 2;
			}}}).data.length, 1);
		},

		'query with sort': function(){
			assert.strictEqual(store.filter({prime: true}).sort('name').data.length, 3);
			assert.strictEqual(store.filter({even: true}).sort('name').data[1].name, 'two');
			assert.strictEqual(store.filter({even: true}).sort(function(a, b){
				return a.name < b.name ? -1 : 1;
			}).data[1].name, 'two');
			assert.strictEqual(store.filter(null).sort('mappedTo').data[4].name, 'four');
		},

		'query with paging': function(){
			assert.strictEqual(store.filter({prime: true}).range(1, 2).data.length, 1);
			assert.strictEqual(store.filter({even: true}).range(1, 2).data[0].name, 'four');
		},

		'query with inheritance': function(){
			var store = new Memory({
				data: [
					{id: 1, name: 'one', prime: false},
					{id: 2, name: 'two', even: true, prime: true}
				],
				getIdentity: function(){
					return 'id-' + this.inherited(arguments);
				},
				newMethod: function(){
					return 'hello';
				}
			});
			var filtered = store.filter({even: true}).sort('name');
			var one = filtered.get(1);
			one.changed = true;
			filtered.put(one);
			assert.strictEqual(filtered.getIdentity(one), 'id-1');
			assert.strictEqual(filtered.newMethod(), 'hello');
			store.remove(1);
			assert.strictEqual(filtered.get(1), undefined);
		},

		'put update': function(){
			var four = store.get(4);
			four.square = true;
			store.put(four);
			four = store.get(4);
			assert.isTrue(four.square);
		},

		save: function(){
			var four = store.get(4);
			four.square = true;
			four.save();
			four = store.get(4);
			assert.isTrue(four.square);
		},

		'put new': function(){
			store.put({
				id: 6,
				perfect: true
			});
			assert.isTrue(store.get(6).perfect);
		},

		'create and remove': function(){
			var newObject = store.create({
				id: 10,
				name: 'ten'
			});
			// due to a bug in geezer's type assertions, this will fail in IE
			assert.isNotObject(store.get(10));
			newObject.save();
			assert.isObject(store.get(10));
			newObject.remove();
			assert.isNotObject(store.get(10));
		},

		'add duplicate': function(){
			store.put({
				id: 6,
				perfect: true
			});

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
		},

		'remove': function(){
			store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(store.remove(7));
			assert.strictEqual(store.get(7), undefined);
		},

		'remove from object': function(){
			var newObject = store.add({
				id: 7,
				prime: true
			});
			assert.isTrue(newObject.remove());
			assert.strictEqual(store.get(7), undefined);
		},

		'remove missing': function(){
			var expectedLength = store.data.length;
			assert(!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.data.length, expectedLength);
		},

		'query after changes': function(){
			store.remove(2);
			store.add({ id: 6, perfect: true });
			assert.strictEqual(store.filter({prime: true}).data.length, 2);
			assert.strictEqual(store.filter({perfect: true}).data.length, 1);
		},

		'ifrs style data': function(){
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
			assert.strictEqual(anotherStore.get('one').name, 'one');
			assert.strictEqual(anotherStore.filter({name: 'one'}).data[0].name, 'one');
		},

		'add new id assignment': function(){
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		},

		'total property': function(){
			var filteredCollection = store.filter(function(o){
				return o.id <= 3;
			});
			assert.property(filteredCollection, 'total');
			assert.strictEqual(filteredCollection.total, filteredCollection.data.length);

			var sortedCollection = store.sort("id");
			assert.strictEqual(sortedCollection.total, sortedCollection.data.length);

			var rangedCollection = store.range(0, 3);
			assert.strictEqual(rangedCollection.total, 5);
			assert.strictEqual(rangedCollection.data.length, 3);
		}
	});

	registerSuite({
		name: 'dstore Memory sorting',

		before: function(){
			store = new Memory({
				data: [
					{id: 1, field1: 'one', field2: '1'},
					{id: 2, field1: 'one', field2: '2'},
					{id: 3, field1: 'two', field2: '5'},
					{id: 4, field1: 'two', field2: '4'},
					{id: 5, field1: 'two', field2: '3'},
					{id: 6, field1: 'one', field2: '3'}
				]
			});
		},

		'multiple sort fields - ascend + ascend': function(){

			var results = store.sort({property: 'field1'},
				{property: 'field2'}).fetch();
			/**
			 * {id: 1, field1: 'one', field2: '1'},
			 * {id: 2, field1: 'one', field2: '2'},
			 * {id: 6, field1: 'one', field2: '3'}
			 * {id: 5, field1: 'two', field2: '3'},
			 * {id: 4, field1: 'two', field2: '4'},
			 * {id: 3, field1: 'two', field2: '5'},
			 */
			assert.strictEqual(results.length, 6, 'Length is 6');
			assert.strictEqual(results[0].id, 1);
			assert.strictEqual(results[1].id, 2);
			assert.strictEqual(results[2].id, 6);
			assert.strictEqual(results[3].id, 5);
			assert.strictEqual(results[4].id, 4);
			assert.strictEqual(results[5].id, 3);
		},

		'multiple sort fields - ascend + descend': function(){

			var results = store.sort({property: 'field1', descending: false},
				{property: 'field2', descending: true}).map(passThrough);
			assert.strictEqual(results.length, 6, 'Length is 6');
			/**
			 * {id: 6, field1: 'one', field2: '3'}
			 * {id: 2, field1: 'one', field2: '2'},
			 * {id: 1, field1: 'one', field2: '1'},
			 * {id: 3, field1: 'two', field2: '5'},
			 * {id: 4, field1: 'two', field2: '4'},
			 * {id: 5, field1: 'two', field2: '3'},
			 */
			assert.strictEqual(results[0].id, 6);
			assert.strictEqual(results[1].id, 2);
			assert.strictEqual(results[2].id, 1);
			assert.strictEqual(results[3].id, 3);
			assert.strictEqual(results[4].id, 4);
			assert.strictEqual(results[5].id, 5);
		},

		'multiple sort fields - descend + ascend': function(){

			var results = store.sort({property: 'field1', descending: true},
				{property: 'field2', descending: false}).map(passThrough);
			/**
			 * {id: 5, field1: 'two', field2: '3'},
			 * {id: 4, field1: 'two', field2: '4'},
			 * {id: 3, field1: 'two', field2: '5'},
			 * {id: 1, field1: 'one', field2: '1'},
			 * {id: 2, field1: 'one', field2: '2'},
			 * {id: 6, field1: 'one', field2: '3'}
			 */
			assert.strictEqual(results.length, 6, 'Length is 6');
			assert.strictEqual(results[0].id, 5);
			assert.strictEqual(results[1].id, 4);
			assert.strictEqual(results[2].id, 3);
			assert.strictEqual(results[3].id, 1);
			assert.strictEqual(results[4].id, 2);
			assert.strictEqual(results[5].id, 6);
		},

		'multiple sort fields - descend + descend': function(){

			var results = store.sort({property: 'field1',descending: true},
				{property: 'field2', descending: true}).map(passThrough);
			/**
			 * {id: 3, field1: 'two', field2: '5'},
			 * {id: 4, field1: 'two', field2: '4'},
			 * {id: 5, field1: 'two', field2: '3'},
			 * {id: 6, field1: 'one', field2: '3'}
			 * {id: 2, field1: 'one', field2: '2'},
			 * {id: 1, field1: 'one', field2: '1'},
			 */
			assert.strictEqual(results.length, 6, 'Length is 6');
			assert.strictEqual(results[0].id, 3);
			assert.strictEqual(results[1].id, 4);
			assert.strictEqual(results[2].id, 5);
			assert.strictEqual(results[3].id, 6);
			assert.strictEqual(results[4].id, 2);
			assert.strictEqual(results[5].id, 1);
		}
	});
});
