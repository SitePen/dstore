define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Memory'
], function(registerSuite, assert, declare, Memory){

	var store = new Memory({
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

	function passThrough(object){ return object; }

	registerSuite({
		name: 'dstore Memory',

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
		},

		'model': function(){
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			assert.strictEqual(store.filter({even: true}).materialize()[1].describe(), 'four is not a prime');
		},

		'query': function(){
			assert.strictEqual(store.filter({prime: true}).materialize().length, 3);
			assert.strictEqual(store.filter({even: true}).materialize()[1].name, 'four');
		},

		'query with string': function(){
			assert.strictEqual(store.filter({name: 'two'}).materialize().length, 1);
			assert.strictEqual(store.filter({name: 'two'}).materialize()[0].name, 'two');
		},

		'query with regexp': function(){
			assert.strictEqual(store.filter({name: /^t/}).materialize().length, 2);
			assert.strictEqual(store.filter({name: /^t/}).materialize()[1].name, 'three');
			assert.strictEqual(store.filter({name: /^o/}).materialize().length, 1);
			assert.strictEqual(store.filter({name: /o/}).materialize().length, 3);
		},

		'query with test function': function(){
			assert.strictEqual(store.filter({id: {test: function(id){
				return id < 4;
			}}}).materialize().length, 3);
			assert.strictEqual(store.filter({even: {test: function(even, object){
				return even && object.id > 2;
			}}}).materialize().length, 1);
		},

		'query with sort': function(){
			assert.strictEqual(store.filter({prime: true}).sort('name').materialize().length, 3);
			assert.strictEqual(store.filter({even: true}).sort('name').materialize()[1].name, 'two');
			assert.strictEqual(store.filter({even: true}).sort(function(a, b){
				return a.name < b.name ? -1 : 1;
			}).materialize()[1].name, 'two');
			assert.strictEqual(store.filter(null).sort('mappedTo').materialize()[4].name, 'four');
		},

		'query with paging': function(){
			assert.strictEqual(store.filter({prime: true}).range(1, 2).materialize().length, 1);
			assert.strictEqual(store.filter({even: true}).range(1, 2).materialize()[0].name, 'four');
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
		},

		'remove': function(){
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
			assert(!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.get(1).id, 1);
		},

		'query after changes': function(){
			assert.strictEqual(store.filter({prime: true}).materialize().length, 3);
			assert.strictEqual(store.filter({perfect: true}).materialize().length, 1);
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
			assert.strictEqual(anotherStore.filter({name: 'one'}).materialize()[0].name, 'one');
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
			filteredCollection.materialize();
			assert.property(filteredCollection, 'total');
			assert.strictEqual(filteredCollection.total, filteredCollection.materialize().length);

			var sortedCollection = store.sort("id");
			sortedCollection.materialize();
			assert.strictEqual(sortedCollection.total, sortedCollection.materialize().length);

			var rangedCollection = store.range(0, 5);
			rangedCollection.materialize();
			assert.strictEqual(rangedCollection.total, 7);
			assert.strictEqual(rangedCollection.materialize().length, 5);
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

			var results = store.sort('field2').sort('field1').map(passThrough);
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

			var results = store.sort('field2', true).sort('field1', false).map(passThrough);
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

			var results = store.sort('field2', false).sort('field1', true).map(passThrough);
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

			var results = store.sort('field2', true).sort('field1', true).map(passThrough);
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
