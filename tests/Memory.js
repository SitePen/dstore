define(["doh", "dstore/Memory"], function(doh, Memory){
	function TestModel(){}
	TestModel.prototype.describe = function(){
		return this.name + " is " + (this.prime ? '' : "not ") + "a prime";
	}
	var store = new Memory({
		data: [
			{id: 1, name: "one", prime: false, mappedTo: "E"}, 
			{id: 2, name: "two", even: true, prime: true, mappedTo: "D"}, 
			{id: 3, name: "three", prime: true, mappedTo: "C"}, 
			{id: 4, name: "four", even: true, prime: false, mappedTo: null}, 
			{id: 5, name: "five", prime: true, mappedTo: "A"} 		
		],
		model: TestModel
	});
	doh.register("dstore.tests.Memory",
		[
			function testGet(t){
				t.is(store.get(1).name, "one");
				t.is(store.get(4).name, "four");
				t.t(store.get(5).prime);
			},
			function testModel(t){
				t.is(store.get(1).describe(), "one is not a prime");
				t.is(store.get(3).describe(), "three is a prime");
				t.is(store.filter({even: true}).data[1].describe(), "four is not a prime");
			},
			function testfilter(t){
				t.is(store.filter({prime: true}).data.length, 3);
				t.is(store.filter({even: true}).data[1].name, "four");
			},
			function testfilterWithString(t){
				t.is(store.filter({name: "two"}).data.length, 1);
				t.is(store.filter({name: "two"}).data[0].name, "two");
			},
			function testfilterWithRegExp(t){
				t.is(store.filter({name: /^t/}).data.length, 2);
				t.is(store.filter({name: /^t/}).data[1].name, "three");
				t.is(store.filter({name: /^o/}).data.length, 1);
				t.is(store.filter({name: /o/}).data.length, 3);
			},
			function testfilterWithTestFunction(t){
				t.is(store.filter({id: {test: function(id){ return id < 4;}}}).data.length, 3);
				t.is(store.filter({even: {test: function(even, object){ return even && object.id > 2;}}}).data.length, 1);
			},
			function testfilterWithSort(t){
				t.is(store.filter({prime: true}).sort("name").data.length, 3);
				t.is(store.filter({even: true}).sort("name").data[1].name, "two");
				t.is(store.filter({even: true}).sort(function(a, b){
						return a.name < b.name ? -1 : 1;
					}).data[1].name, "two");
				t.is(store.filter(null).sort("mappedTo").data[4].name, "four");
			},
			function testfilterWithPaging(t){
				t.is(store.filter({prime: true}).range(1, 2).data.length, 1);
				t.is(store.filter({even: true}).range(1, 2).data[0].name, "four");
			},
			function testPutUpdate(t){
				var four = store.get(4);
				four.square = true;
				store.put(four);
				four = store.get(4);
				t.t(four.square);
			},
			function testPutNew(t){
				store.put({
					id: 6,
					perfect: true
				});
				t.t(store.get(6).perfect);
			},
			function testAddDuplicate(t){
				var threw;
				try{
					store.add({
						id: 6,
						perfect: true
					});
				}catch(e){
					threw = true;
				}
				t.t(threw);
			},
			function testAddNew(t){
				store.add({
					id: 7,
					prime: true
				});
				t.t(store.get(7).prime);
			},
			function testRemove(t){
				t.t(store.remove(7));
				t.is(store.get(7), undefined);
			},
			function testRemoveMissing(t){
				t.f(store.remove(77));
				// make sure nothing changed
				t.is(store.get(1).id, 1);
			},
			function testfilterAfterChanges(t){
				t.is(store.filter({prime: true}).data.length, 3);
				t.is(store.filter({perfect: true}).data.length, 1);
			},
			function testIFRSStyleData(t){
				var anotherStore = new Memory({
					data: {
						items:[
							{name: "one", prime: false},
							{name: "two", even: true, prime: true},
							{name: "three", prime: true}
						],
						identifier: "name"
					}
				});
				t.is(anotherStore.get("one").name,"one");
				t.is(anotherStore.filter({name:"one"}).data[0].name,"one");
			},
			function testAddNewIdAssignment(t){
				var object = {
					random: true
				};
				store.add(object);
				t.t(!!object.id);
			}
		]
	);
});
