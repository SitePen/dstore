define([
	'dojo/_base/declare',
	'intern!object',
	'intern/chai!assert',
	'dojo/store/Memory',
	'dstore/legacy/StoreAdapter'
], function(declare, registerSuite, assert, Memory, StoreAdapter){

	var TestModel = declare(null, {
		describe: function(){
			return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
		}
	});

	var AdaptedStore = declare([Memory, StoreAdapter]);

	function getResultsArray(store){
		var results = [];
		store.forEach(function(data){
			results.push(data);
		});
		return results;
	}

	var legacyStore;
	var store;

	registerSuite({
		name: 'legacy dojo/store adapter - Memory',

		beforeEach: function(){
			store = new AdaptedStore({
				data: [
					{id: 1, name: 'one', prime: false, mappedTo: 'E'},
					{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D'},
					{id: 3, name: 'three', prime: true, mappedTo: 'C'},
					{id: 4, name: 'four', even: true, prime: false, mappedTo: null},
					{id: 5, name: 'five', prime: true, mappedTo: 'A'}
				],
				model: TestModel
			});
		},

		'get': function(){
			assert.strictEqual(store.get(1).name, 'one');
			assert.strictEqual(store.get(4).name, 'four');
			assert.isTrue(store.get(5).prime);
			assert.strictEqual(store.getIdentity(store.get(1)), 1);
		},

		'model': function(){
			assert.strictEqual(store.get(1).describe(), 'one is not a prime');
			assert.strictEqual(store.get(3).describe(), 'three is a prime');
			var results = getResultsArray(store.filter({even: true}));
			assert.strictEqual(results.length, 2, 'The length is 2');
			assert.strictEqual(results[1].describe(), 'four is not a prime');
		},

		'query': function(){
			assert.strictEqual(getResultsArray(store.filter({prime: true})).length, 3);
			assert.strictEqual(getResultsArray(store.filter({even: true}))[1].name, 'four');
		},

		'query with string': function(){
			assert.strictEqual(getResultsArray(store.filter({name: 'two'})).length, 1);
			assert.strictEqual(getResultsArray(store.filter({name: 'two'}))[0].name, 'two');
		},

		'query with regexp': function(){
			assert.strictEqual(getResultsArray(store.filter({name: /^t/})).length, 2);
			assert.strictEqual(getResultsArray(store.filter({name: /^t/}))[1].name, 'three');
			assert.strictEqual(getResultsArray(store.filter({name: /^o/})).length, 1);
			assert.strictEqual(getResultsArray(store.filter({name: /o/})).length, 3);
		},

		'query with test function': function(){
			assert.strictEqual(getResultsArray(store.filter({id: {test: function(id){
				return id < 4;
			}}})).length, 3);
			assert.strictEqual(getResultsArray(store.filter({even: {test: function(even, object){
				return even && object.id > 2;
			}}})).length, 1);
		},

		'query with sort': function(){
			assert.strictEqual(getResultsArray(store.filter({prime: true}).sort('name')).length, 3);
			assert.strictEqual(getResultsArray(store.filter({even: true}).sort('name'))[1].name, 'two');
			assert.strictEqual(getResultsArray(store.filter({even: true}).sort(function(a, b){
				return a.name < b.name ? -1 : 1;
			}))[1].name, 'two');
			assert.strictEqual(getResultsArray(store.filter(null).sort('mappedTo'))[4].name, 'four');
		},

		'query with paging': function(){
			assert.strictEqual(getResultsArray(store.filter({prime: true}).range(1, 2)).length, 1);
			assert.strictEqual(getResultsArray(store.filter({even: true}).range(1, 2))[0].name, 'four');
		},

		'put update': function(){
			var four = store.get(4);
			four.square = true;
			store.put(four);
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
					id: 5,
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
			assert.isTrue(store.remove(3));
			assert.strictEqual(store.get(3), undefined);
		},

		'remove missing': function(){
			assert(!store.remove(77));
			// make sure nothing changed
			assert.strictEqual(store.get(1).id, 1);
		},

		'query after changes': function(){
			store.add({ id: 7, prime: true });
			assert.strictEqual(getResultsArray(store.filter({prime: true})).length, 4);
			assert.strictEqual(getResultsArray(store.filter({perfect: true})).length, 0);
			store.remove(3);
			store.put({ id: 6, perfect: true });
			assert.strictEqual(getResultsArray(store.filter({prime: true})).length, 3);
			assert.strictEqual(getResultsArray(store.filter({perfect: true})).length, 1);
		},

		'ifrs style data': function(){
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
			var anotherStore = StoreAdapter.adapt(anotherLegacy);

			assert.strictEqual(anotherStore.get('one').name, 'one');
			assert.strictEqual(anotherStore.getIdentity(anotherStore.get('one')), 'one');
			assert.strictEqual(getResultsArray(anotherStore.filter({name: 'one'}))[0].name, 'one');
		},

		'add new id assignment': function(){
			var object = {
				random: true
			};
			store.add(object);
			assert.isTrue(!!object.id);
		}
	});

	registerSuite({
		name: 'legacy dojo/store adapter sorting - Memory',

		before: function(){
			legacyStore = new Memory({
				data: [
					{id: 1, field1: 'one', field2: '1'},
					{id: 2, field1: 'one', field2: '2'},
					{id: 3, field1: 'two', field2: '5'},
					{id: 4, field1: 'two', field2: '4'},
					{id: 5, field1: 'two', field2: '3'},
					{id: 6, field1: 'one', field2: '3'}
				]
			});

			store = StoreAdapter.adapt(legacyStore, {
				model: TestModel
			});
		},

		'multiple sort fields - ascend + ascend': function(){

			var results = getResultsArray(store.sort('field2').sort('field1'));
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

			var results = getResultsArray(store.sort('field2', true).sort('field1', false));
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

			var results = getResultsArray(store.sort('field2', false).sort('field1', true));
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

			var results = getResultsArray(store.sort('field2', true).sort('field2', true));
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
